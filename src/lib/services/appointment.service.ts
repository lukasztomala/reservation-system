import { z } from "zod";
import type { AppointmentListRequestDto, AppointmentListResponseDto, AppointmentDto, PaginationDto } from "../../types";
import { supabaseClient } from "../../db/supabase.client";

/**
 * Schema walidacji dla parametrów query endpoint GET /appointments
 * Wszystkie parametry są opcjonalne zgodnie z specyfikacją API
 */
const appointmentListRequestSchema = z.object({
  client_id: z.string().uuid("Invalid client_id format").optional(),
  staff_id: z.string().uuid("Invalid staff_id format").optional(),
  status: z
    .enum(["booked", "blocked", "cancelled"], {
      errorMap: () => ({ message: "Invalid status. Must be: booked, blocked, cancelled" }),
    })
    .optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .optional(),
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().min(1, "Limit must be at least 1").max(100, "Limit must be between 1 and 100").default(20),
  sort: z
    .enum(["start_time", "created_at"], {
      errorMap: () => ({ message: "Invalid sort field. Must be: start_time, created_at" }),
    })
    .default("start_time"),
  order: z
    .enum(["asc", "desc"], {
      errorMap: () => ({ message: "Invalid order. Must be: asc, desc" }),
    })
    .default("asc"),
});

/**
 * Service odpowiedzialny za zarządzanie wizytami
 * Zawiera logikę biznesową dla operacji CRUD na wizytach
 */
export class AppointmentService {
  /**
   * Waliduje parametry żądania dla listy wizyt
   */
  validateAppointmentListRequest(
    queryParams: Record<string, string>
  ): { success: true; data: AppointmentListRequestDto } | { success: false; error: { errors: z.ZodIssue[] } } {
    try {
      const validated = appointmentListRequestSchema.parse(queryParams);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: { errors: error.errors } };
      }
      return {
        success: false,
        error: {
          errors: [
            {
              code: "custom" as const,
              path: [],
              message: "Validation failed",
            },
          ],
        },
      };
    }
  }

  /**
   * Pobiera listę wizyt z bazy danych z filtrowaniem, sortowaniem i paginacją
   */
  async getAppointments(request: AppointmentListRequestDto): Promise<AppointmentListResponseDto> {
    try {
      // Budowanie zapytania z JOIN do tabeli users
      let query = supabaseClient.from("appointments").select(`
          id,
          client_id,
          staff_id,
          start_time,
          end_time,
          status,
          cancellation_reason,
          created_at,
          updated_at,
          client:users!appointments_client_id_fkey(first_name, last_name),
          staff:users!appointments_staff_id_fkey(first_name, last_name)
        `);

      // Aplikowanie filtrów
      if (request.client_id) {
        query = query.eq("client_id", request.client_id);
      }

      if (request.staff_id) {
        query = query.eq("staff_id", request.staff_id);
      }

      if (request.status) {
        query = query.eq("status", request.status);
      }

      if (request.start_date) {
        query = query.gte("start_time", `${request.start_date}T00:00:00.000Z`);
      }

      if (request.end_date) {
        query = query.lte("start_time", `${request.end_date}T23:59:59.999Z`);
      }

      // Sortowanie
      const sortColumn = request.sort || "start_time";
      const sortOrder = request.order || "asc";
      query = query.order(sortColumn, { ascending: sortOrder === "asc" });

      // Paginacja - najpierw liczymy total
      const { count: total, error: countError } = await supabaseClient
        .from("appointments")
        .select("*", { count: "exact", head: true });

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      // Obliczanie offset dla paginacji
      const page = request.page || 1;
      const limit = request.limit || 20;
      const offset = (page - 1) * limit;

      // Aplikowanie paginacji do głównego zapytania
      query = query.range(offset, offset + limit - 1);

      // Wykonanie zapytania
      const { data: appointments, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Import AppointmentStatus type
      type AppointmentStatus = "booked" | "blocked" | "cancelled";

      // Mapowanie wyników do DTO
      const appointmentDtos: AppointmentDto[] = (appointments || []).map(
        (appointment: {
          id: string;
          client_id: string;
          staff_id: string;
          start_time: string;
          end_time: string;
          status: AppointmentStatus;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
          client: { first_name: string; last_name: string } | null;
          staff: { first_name: string; last_name: string } | null;
        }) => ({
          id: appointment.id,
          client_id: appointment.client_id,
          staff_id: appointment.staff_id,
          client_name: appointment.client
            ? `${appointment.client.first_name} ${appointment.client.last_name}`.trim()
            : "Unknown Client",
          staff_name: appointment.staff
            ? `${appointment.staff.first_name} ${appointment.staff.last_name}`.trim()
            : "Unknown Staff",
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
          cancellation_reason: appointment.cancellation_reason,
          created_at: appointment.created_at,
          updated_at: appointment.updated_at,
        })
      );

      // Tworzenie obiektu paginacji
      const totalPages = Math.ceil((total || 0) / limit);
      const pagination: PaginationDto = {
        page,
        limit,
        total: total || 0,
        total_pages: totalPages,
      };

      return {
        appointments: appointmentDtos,
        pagination,
      };
    } catch (error) {
      console.error("Error in getAppointments:", error);
      throw error;
    }
  }
}

// Singleton instance
export const appointmentService = new AppointmentService();
