import { z } from "zod";
import type { SupabaseClient } from "../../db/supabase.client";
import type {
  AvailableSlotsResponseDto,
  AvailableSlotDto,
  GenerateAvailableSlotsCommand,
} from "../../types";
import { DEFAULT_WORKING_HOURS, APPOINTMENT_DURATIONS, timeToMinutes, minutesToTime } from "../config/workingHours";

// Schema walidacji dla query parametrów
export const availableSlotsRequestSchema = z
  .object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
    staff_id: z.string().uuid("Invalid staff_id UUID format").optional(),
    appointment_type: z
      .enum(["first_visit", "follow_up"], {
        errorMap: () => ({ message: "Invalid appointment_type. Must be: first_visit, follow_up" }),
      })
      .optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0;
    },
    {
      message: "end_date must be after start_date",
      path: ["end_date"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    },
    {
      message: "Date range cannot exceed 30 days",
      path: ["end_date"],
    }
  );

type ValidatedRequest = z.infer<typeof availableSlotsRequestSchema>;

export class AppointmentAvailabilityService {
  /**
   * Generuje dostępne terminy wizyt w określonym zakresie dat
   * @param supabase - klient Supabase
   * @param command - parametry wyszukiwania
   * @returns lista dostępnych terminów z informacjami o working hours
   */
  async generateAvailableSlots(
    supabase: SupabaseClient,
    command: GenerateAvailableSlotsCommand
  ): Promise<AvailableSlotsResponseDto> {
    try {
      // Walidacja parametrów wejściowych
      const validatedParams = availableSlotsRequestSchema.parse({
        start_date: command.start_date,
        end_date: command.end_date,
        staff_id: command.staff_id,
        appointment_type: command.appointment_type,
      });

      // 1. Pobranie zajętych terminów z bazy danych
      const bookedSlots = await this.getBookedSlots(supabase, validatedParams);

      // 2. Pobranie informacji o staff (jeśli filtrujemy po staff_id)
      const staffMembers = await this.getStaffMembers(supabase, validatedParams.staff_id);

      // 3. Generowanie wszystkich możliwych time slots
      const allSlots = this.generateTimeSlots(
        validatedParams,
        command.working_hours || DEFAULT_WORKING_HOURS,
        staffMembers
      );

      // 4. Filtrowanie dostępnych slotów (wykluczenie zajętych)
      const availableSlots = this.filterAvailableSlots(allSlots, bookedSlots);

      return {
        available_slots: availableSlots,
        working_hours: command.working_hours || DEFAULT_WORKING_HOURS,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Re-throw validation errors for API endpoint to handle
        throw error;
      }

      console.error("Error generating available slots:", error);
      throw new Error("Failed to generate available slots");
    }
  }

  /**
   * Pobiera zajęte terminy z bazy danych w określonym zakresie
   */
  private async getBookedSlots(
    supabase: SupabaseClient,
    params: ValidatedRequest
  ): Promise<{ start_time: string; end_time: string; staff_id: string }[]> {
    let query = supabase
      .from("appointments")
      .select("start_time, end_time, staff_id")
      .in("status", ["booked", "blocked"])
      .gte("start_time", `${params.start_date} 00:00:00`)
      .lte("start_time", `${params.end_date} 23:59:59`);

    // Opcjonalne filtrowanie po staff_id
    if (params.staff_id) {
      query = query.eq("staff_id", params.staff_id);
    }

    const { data, error } = await query.order("start_time");

    if (error) {
      console.error("Database error fetching booked slots:", error);
      throw new Error("Failed to fetch booked appointments");
    }

    return data || [];
  }

  /**
   * Pobiera informacje o członkach personelu
   */
  private async getStaffMembers(
    supabase: SupabaseClient,
    staffId?: string
  ): Promise<{ id: string; first_name: string; last_name: string }[]> {
    let query = supabase.from("users").select("id, first_name, last_name").eq("role", "staff");

    if (staffId) {
      query = query.eq("id", staffId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error fetching staff members:", error);
      throw new Error("Failed to fetch staff information");
    }

    return data || [];
  }

  /**
   * Generuje wszystkie możliwe time slots w zakresie dat
   */
  private generateTimeSlots(
    params: ValidatedRequest,
    workingHours: { start: string; end: string },
    staffMembers: { id: string; first_name: string; last_name: string }[]
  ): AvailableSlotDto[] {
    const slots: AvailableSlotDto[] = [];
    const startDate = new Date(params.start_date);
    const endDate = new Date(params.end_date);

    const workingStartMinutes = timeToMinutes(workingHours.start);
    const workingEndMinutes = timeToMinutes(workingHours.end);

    // Iterujemy po każdym dniu w zakresie
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split("T")[0];

      // Iterujemy po każdym członku personelu
      for (const staff of staffMembers) {
        // Generujemy sloty dla każdego typu wizyty (jeśli nie ma filtra lub jest określony typ)
        const appointmentTypes = params.appointment_type
          ? [params.appointment_type]
          : ["first_visit" as const, "follow_up" as const];

        for (const type of appointmentTypes) {
          const duration = APPOINTMENT_DURATIONS[type];

          // Generujemy time slots w ramach godzin pracy
          for (
            let timeMinutes = workingStartMinutes;
            timeMinutes + duration <= workingEndMinutes;
            timeMinutes += duration
          ) {
            const timeStr = minutesToTime(timeMinutes);

            slots.push({
              date: dateStr,
              time: timeStr,
              staff_id: staff.id,
              staff_name: `${staff.first_name} ${staff.last_name}`,
              duration_hours: duration / 60,
              appointment_type: type,
            });
          }
        }
      }
    }

    return slots;
  }

  /**
   * Filtruje dostępne sloty wykluczając zajęte terminy
   */
  private filterAvailableSlots(
    allSlots: AvailableSlotDto[],
    bookedSlots: { start_time: string; end_time: string; staff_id: string }[]
  ): AvailableSlotDto[] {
    return allSlots.filter((slot) => {
      const slotStart = new Date(`${slot.date}T${slot.time}:00`);
      const slotEnd = new Date(slotStart.getTime() + slot.duration_hours * 60 * 60 * 1000);

      // Sprawdzamy czy slot koliduje z którimkolwiek zarezerwowanym terminem
      return !bookedSlots.some((booked) => {
        const bookedStart = new Date(booked.start_time);
        const bookedEnd = new Date(booked.end_time);

        // Kolizja występuje gdy sloty się nakładają i dotyczą tego samego staff
        return booked.staff_id === slot.staff_id && slotStart < bookedEnd && slotEnd > bookedStart;
      });
    });
  }
}

// Export singleton instance
export const appointmentAvailabilityService = new AppointmentAvailabilityService(); 