import type { APIRoute } from "astro";
import { appointmentService } from "../../lib/services/appointment.service";
import type { CreateAppointmentRequestDto, CreateAppointmentCommand, ErrorDto, ValidationErrorDto } from "../../types";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Parse query parameters from URL
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Validate query parameters using the service
    const validationResult = appointmentService.validateAppointmentListRequest(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: "Invalid query parameters",
            code: "VALIDATION_ERROR",
            details: validationResult.error.errors,
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get appointments using the service
    try {
      const result = await appointmentService.getAppointments(validationResult.data);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            appointments: result.appointments,
            pagination: {
              page: result.pagination.page,
              limit: result.pagination.limit,
              total: result.pagination.total,
              total_pages: result.pagination.total_pages,
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (serviceError: unknown) {
      console.error("Service error:", serviceError);

      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: "Failed to fetch appointments",
            code: "SERVICE_ERROR",
            details: errorMessage,
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: unknown) {
    console.error("Unexpected error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * POST /api/appointments
 * Creates a new appointment with business logic validation
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // TEMPORARY TEST MODE: Skip authentication if X-Test-Mode header is present
    const testMode = request.headers.get("X-Test-Mode");
    let userData: { id: string; role: string };

    if (testMode === "enabled") {
      // Use hardcoded test user data for testing
      userData = {
        id: "e4ca431b-b0da-4683-8765-c624f8c5651a", // CLIENT_USER_ID
        role: "staff", // Use staff role so they can create appointments for any client
      };
      console.log("TEST MODE: Using hardcoded user data for testing");
    } else {
      // Normal authentication flow
      // 1. Sprawdź autoryzację
      const supabase = locals.supabase;
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        const errorResponse: ErrorDto = {
          message: "Authentication required",
          code: "UNAUTHORIZED",
        };
        return new Response(JSON.stringify({ error: errorResponse }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 2. Pobierz dane użytkownika z bazy
      const { data: userDataFromDB, error: userError } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (userError || !userDataFromDB) {
        const errorResponse: ErrorDto = {
          message: "User not found",
          code: "USER_NOT_FOUND",
        };
        return new Response(JSON.stringify({ error: errorResponse }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      userData = userDataFromDB;
    }

    // 3. Parsuj request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      const errorResponse: ErrorDto = {
        message: "Invalid JSON in request body",
        code: "INVALID_JSON",
      };
      return new Response(JSON.stringify({ error: errorResponse }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Walidacja request body
    const validationResult = appointmentService.validateCreateAppointmentRequest(requestBody);
    if (!validationResult.success) {
      const validationError: ValidationErrorDto = {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        field_errors: validationResult.error.errors.reduce(
          (acc, error) => {
            const field = error.path.join(".");
            if (!acc[field]) acc[field] = [];
            acc[field].push(error.message);
            return acc;
          },
          {} as Record<string, string[]>
        ),
      };
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validatedData: CreateAppointmentRequestDto = validationResult.data;

    // 5. Tworzenie command object
    const command: CreateAppointmentCommand = {
      client_id: validatedData.client_id,
      staff_id: validatedData.staff_id,
      start_time: validatedData.start_time,
      appointment_type: validatedData.appointment_type,
      client_note: validatedData.client_note,
    };

    // 6. Tworzenie wizyty przez service
    const result = await appointmentService.createAppointment(
      command,
      userData.id,
      userData.role as "client" | "staff"
    );

    if (!result.success) {
      // Mapowanie błędów biznesowych na kody HTTP
      let statusCode = 500;

      switch (result.error.code) {
        case "FORBIDDEN":
        case "INVALID_CLIENT":
        case "INVALID_STAFF":
          statusCode = 403;
          break;
        case "TIME_SLOT_CONFLICT":
        case "SLOT_UNAVAILABLE":
          statusCode = 409;
          break;
        case "DATABASE_ERROR":
          statusCode = 500;
          break;
        default:
          statusCode = 400;
      }

      const errorResponse: ErrorDto = {
        message: result.error.message,
        code: result.error.code,
      };

      return new Response(JSON.stringify({ error: errorResponse }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 7. Zwróć sukces
    return new Response(JSON.stringify(result.data), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/appointments:", error);

    const errorResponse: ErrorDto = {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    };

    return new Response(JSON.stringify({ error: errorResponse }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
