import type { APIRoute } from "astro";
import { z } from "zod";
import { appointmentAvailabilityService } from "../../../lib/services/appointment.availability.service";
import type { AvailableSlotsResponseDto, ValidationErrorDto, ApiResponse } from "../../../types";

export const prerender = false;

/**
 * GET /api/appointments/available - Pobiera dostępne terminy wizyt w określonym zakresie dat
 *
 * Autoryzacja: Wszyscy zalogowani użytkownicy (client i staff)
 * Query parametry:
 * - start_date (string, wymagany): Data początkowa (YYYY-MM-DD)
 * - end_date (string, wymagany): Data końcowa (YYYY-MM-DD, max 30 dni od start_date)
 * - staff_id (UUID, opcjonalny): Filtr po konkretnym pracowniku
 * - appointment_type (enum, opcjonalny): first_visit|follow_up
 *
 * @param request - Request object
 * @param locals - Locals object zawierający supabase client
 * @returns Response z dostępnymi terminami lub błędem
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Early return - sprawdzenie dostępności klienta Supabase
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: {
          message: "Internal server error",
          code: "SERVER_ERROR",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO: Implementacja autoryzacji - sprawdzenie czy użytkownik jest zalogowany
    // Tymczasowo pomijamy autoryzację zgodnie z planem implementacji po etapach

    // Parsowanie query parametrów
    const url = new URL(request.url);
    const queryParams = {
      start_date: url.searchParams.get("start_date"),
      end_date: url.searchParams.get("end_date"),
      staff_id: url.searchParams.get("staff_id") || undefined,
      appointment_type: url.searchParams.get("appointment_type") || undefined,
    };

    // Early return - walidacja wymaganych parametrów
    if (!queryParams.start_date || !queryParams.end_date) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: {
          message: "start_date and end_date are required",
          code: "MISSING_REQUIRED_PARAMS",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Przygotowanie command dla service layer
    const command = {
      start_date: queryParams.start_date,
      end_date: queryParams.end_date,
      staff_id: queryParams.staff_id,
      appointment_type: queryParams.appointment_type as "first_visit" | "follow_up" | undefined,
    };

    try {
      // Wywołanie service layer
      const result: AvailableSlotsResponseDto = await appointmentAvailabilityService.generateAvailableSlots(
        supabase,
        command
      );

      // Sukces - zwrócenie dostępnych terminów
      const successResponse: ApiResponse<AvailableSlotsResponseDto> = {
        success: true,
        data: result,
      };

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (serviceError) {
      // Obsługa błędów z AppointmentAvailabilityService
      if (serviceError instanceof z.ZodError) {
        const fieldErrors: Record<string, string[]> = {};

        serviceError.errors.forEach((err) => {
          const field = err.path.join(".");
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(err.message);
        });

        const validationError: ValidationErrorDto = {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          field_errors: fieldErrors,
        };

        const errorResponse: ApiResponse<never> = {
          success: false,
          error: validationError,
        };

        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (serviceError instanceof Error) {
        // Błędy związane z bazą danych
        if (serviceError.message.includes("Failed to fetch") || serviceError.message.includes("Database error")) {
          console.error("Database error in available slots:", serviceError);
          const errorResponse: ApiResponse<never> = {
            success: false,
            error: {
              message: "Internal server error",
              code: "DATABASE_ERROR",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Inne błędy biznesowe
        console.warn("Business error in available slots:", serviceError.message);
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: {
            message: serviceError.message,
            code: "BUSINESS_ERROR",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  } catch (error) {
    // Catch-all dla nieoczekiwanych błędów
    console.error("Unexpected error in GET /appointments/available:", error);
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fallback return (nie powinno się nigdy zdarzyć)
  const fallbackError: ApiResponse<never> = {
    success: false,
    error: {
      message: "Internal server error",
      code: "SERVER_ERROR",
    },
  };
  return new Response(JSON.stringify(fallbackError), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
};
