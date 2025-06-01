import { z } from "zod";
import type {
  AppointmentListRequestDto,
  AppointmentListResponseDto,
  AppointmentDto,
  PaginationDto,
  CreateAppointmentRequestDto,
  CreateAppointmentResponseDto,
  CreateAppointmentCommand,
} from "../../types";
import { supabaseClient } from "../../db/supabase.client";
import { calculateEndTime, isTimeInFuture } from "../utils/dateCalculations";

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
 * Schema walidacji dla tworzenia nowej wizyty
 */
const createAppointmentRequestSchema = z
  .object({
    client_id: z.string().uuid("Invalid client_id format"),
    staff_id: z.string().uuid("Invalid staff_id format"),
    start_time: z.string().datetime("Invalid start_time format. Use ISO8601"),
    appointment_type: z.enum(["first_visit", "follow_up"], {
      errorMap: () => ({ message: "Invalid appointment_type. Must be: first_visit, follow_up" }),
    }),
    client_note: z.string().max(500, "Client note must be at most 500 characters").optional(),
  })
  .refine(
    (data) => {
      return isTimeInFuture(data.start_time);
    },
    {
      message: "Cannot create appointments in the past",
      path: ["start_time"],
    }
  );

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
   * Waliduje parametry żądania dla tworzenia nowej wizyty
   */
  validateCreateAppointmentRequest(
    requestBody: unknown
  ): { success: true; data: CreateAppointmentRequestDto } | { success: false; error: { errors: z.ZodIssue[] } } {
    try {
      const validated = createAppointmentRequestSchema.parse(requestBody);
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
   * Sprawdza czy użytkownik ma uprawnienia do tworzenia wizyty dla danego klienta
   */
  private async validateUserPermissions(
    userId: string,
    userRole: "client" | "staff",
    clientId: string
  ): Promise<{ success: true } | { success: false; error: { message: string; code: string } }> {
    // Clients mogą tworzyć wizyty tylko dla siebie
    if (userRole === "client" && userId !== clientId) {
      return {
        success: false,
        error: {
          message: "Cannot create appointment for other clients",
          code: "FORBIDDEN",
        },
      };
    }

    return { success: true };
  }

  /**
   * Sprawdza czy użytkownicy istnieją i mają odpowiednie role
   */
  private async validateUsersExistence(
    clientId: string,
    staffId: string
  ): Promise<{ success: true } | { success: false; error: { message: string; code: string } }> {
    try {
      // Sprawdź czy client istnieje i ma rolę client
      const { data: client, error: clientError } = await supabaseClient
        .from("users")
        .select("id, role")
        .eq("id", clientId)
        .eq("role", "client")
        .single();

      if (clientError || !client) {
        return {
          success: false,
          error: {
            message: "client_id must refer to a user with client role",
            code: "INVALID_CLIENT",
          },
        };
      }

      // Sprawdź czy staff istnieje i ma rolę staff
      const { data: staff, error: staffError } = await supabaseClient
        .from("users")
        .select("id, role")
        .eq("id", staffId)
        .eq("role", "staff")
        .single();

      if (staffError || !staff) {
        return {
          success: false,
          error: {
            message: "staff_id must refer to a user with staff role",
            code: "INVALID_STAFF",
          },
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error validating users existence:", error);
      return {
        success: false,
        error: {
          message: "Database error occurred",
          code: "DATABASE_ERROR",
        },
      };
    }
  }

  /**
   * Sprawdza czy time slot jest dostępny (brak konfliktów)
   */
  private async checkTimeSlotAvailability(
    staffId: string,
    startTime: string,
    endTime: string
  ): Promise<{ success: true } | { success: false; error: { message: string; code: string } }> {
    try {
      // Sprawdzenie nakładających się terminów
      const { data: conflicts, error } = await supabaseClient
        .from("appointments")
        .select("id")
        .eq("staff_id", staffId)
        .in("status", ["booked", "blocked"])
        .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

      if (error) {
        console.error("Error checking time slot availability:", error);
        return {
          success: false,
          error: {
            message: "Database error occurred",
            code: "DATABASE_ERROR",
          },
        };
      }

      if (conflicts && conflicts.length > 0) {
        return {
          success: false,
          error: {
            message: "Time slot conflicts with existing appointment",
            code: "TIME_SLOT_CONFLICT",
          },
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error in checkTimeSlotAvailability:", error);
      return {
        success: false,
        error: {
          message: "Internal server error",
          code: "DATABASE_ERROR",
        },
      };
    }
  }

  /**
   * Tworzy nową wizytę
   */
  async createAppointment(
    command: CreateAppointmentCommand,
    userId: string,
    userRole: "client" | "staff"
  ): Promise<
    { success: true; data: CreateAppointmentResponseDto } | { success: false; error: { message: string; code: string } }
  > {
    try {
      // 1. Sprawdź uprawnienia użytkownika
      const permissionResult = await this.validateUserPermissions(userId, userRole, command.client_id);
      if (!permissionResult.success) {
        return permissionResult;
      }

      // 2. Sprawdź istnienie użytkowników i ich role
      const usersResult = await this.validateUsersExistence(command.client_id, command.staff_id);
      if (!usersResult.success) {
        return usersResult;
      }

      // 3. Oblicz end_time
      const endTime = calculateEndTime(command.start_time, command.appointment_type);

      // 4. Sprawdź dostępność time slot
      const availabilityResult = await this.checkTimeSlotAvailability(command.staff_id, command.start_time, endTime);
      if (!availabilityResult.success) {
        return availabilityResult;
      }

      // 5. Utwórz wizytę w bazie danych
      const { data: appointment, error } = await supabaseClient
        .from("appointments")
        .insert({
          client_id: command.client_id,
          staff_id: command.staff_id,
          start_time: command.start_time,
          end_time: endTime,
          status: "booked",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating appointment:", error);

        // Handle exclusion constraint violation
        if (error.code === "23P01" || error.message.includes("exclusion")) {
          return {
            success: false,
            error: {
              message: "Appointment time slot is not available",
              code: "SLOT_UNAVAILABLE",
            },
          };
        }

        return {
          success: false,
          error: {
            message: "Database error occurred",
            code: "DATABASE_ERROR",
          },
        };
      }

      // 6. Zwróć odpowiedź
      const response: CreateAppointmentResponseDto = {
        id: appointment.id,
        client_id: appointment.client_id,
        staff_id: appointment.staff_id,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,
      };

      return { success: true, data: response };
    } catch (error) {
      console.error("Error in createAppointment:", error);
      return {
        success: false,
        error: {
          message: "Internal server error",
          code: "DATABASE_ERROR",
        },
      };
    }
  }

  /**
   * Pobiera szczegóły pojedynczej wizyty na podstawie ID z kontrolą dostępu
   * @param appointmentId UUID wizyty
   * @param userId ID zalogowanego użytkownika
   * @param userRole Rola użytkownika (client/staff)
   * @returns Promise z danymi wizyty lub błędem
   */
  async getAppointmentById(
    appointmentId: string,
    userId: string,
    userRole: "client" | "staff"
  ): Promise<
    | {
        success: true;
        data: AppointmentDto;
      }
    | {
        success: false;
        error: {
          message: string;
          code: "NOT_FOUND" | "ACCESS_DENIED" | "DATABASE_ERROR";
        };
      }
  > {
    try {
      // Query z JOIN do tabeli users dla client i staff
      const { data: appointment, error } = await supabaseClient
        .from("appointments")
        .select(
          `
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
        `
        )
        .eq("id", appointmentId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned - appointment not found
          return {
            success: false,
            error: {
              message: "Appointment not found",
              code: "NOT_FOUND",
            },
          };
        }

        console.error("Database error in getAppointmentById:", error);
        return {
          success: false,
          error: {
            message: "Database error occurred",
            code: "DATABASE_ERROR",
          },
        };
      }

      // Authorization check
      if (userRole === "client" && appointment.client_id !== userId) {
        return {
          success: false,
          error: {
            message: "Access denied to this appointment",
            code: "ACCESS_DENIED",
          },
        };
      }

      // Transform to DTO format
      const appointmentDto: AppointmentDto = {
        id: appointment.id,
        client_id: appointment.client_id,
        staff_id: appointment.staff_id,
        client_name: appointment.client
          ? `${appointment.client.first_name} ${appointment.client.last_name}`.trim()
          : "Unknown Client",
        staff_name: appointment.staff
          ? `${appointment.staff.first_name} ${appointment.staff.last_name}`.trim()
          : undefined,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        cancellation_reason: appointment.cancellation_reason,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,
      };

      return {
        success: true,
        data: appointmentDto,
      };
    } catch (error) {
      console.error("Error in getAppointmentById:", error);
      return {
        success: false,
        error: {
          message: "Internal server error",
          code: "DATABASE_ERROR",
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
