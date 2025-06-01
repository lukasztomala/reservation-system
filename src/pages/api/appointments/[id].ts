import type { APIRoute } from "astro";
import { z } from "zod";
import type { ErrorDto, AppointmentDto } from "../../../types";
import { appointmentService } from "../../../lib/services/appointment.service";

export const prerender = false;

/**
 * Schema for validating appointment ID parameter
 * Must be a valid UUID format
 */
const appointmentIdSchema = z.string().uuid("Invalid appointment ID format");

/**
 * Schema for validating the response structure to ensure data integrity
 */
const appointmentResponseSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  client_name: z.string().min(1),
  staff_name: z.string().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  status: z.enum(["booked", "blocked", "cancelled"]),
  cancellation_reason: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Validates the appointment ID parameter from the URL
 */
function validateAppointmentId(
  id: string | undefined
): { success: true; data: string } | { success: false; error: ErrorDto } {
  if (!id) {
    return {
      success: false,
      error: {
        message: "Appointment ID is required",
        code: "MISSING_PARAMETER",
      },
    };
  }

  try {
    const validatedId = appointmentIdSchema.parse(id);
    return { success: true, data: validatedId };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: error.errors[0]?.message || "Invalid appointment ID format",
          code: "INVALID_FORMAT",
        },
      };
    }

    return {
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
      },
    };
  }
}

/**
 * Validates the appointment response data
 */
function validateAppointmentResponse(
  data: AppointmentDto
): { success: true; data: AppointmentDto } | { success: false; error: ErrorDto } {
  try {
    const validatedData = appointmentResponseSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    console.error("Response validation failed:", error);
    return {
      success: false,
      error: {
        message: "Invalid response data format",
        code: "DATA_VALIDATION_ERROR",
      },
    };
  }
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(message: string, code: string, status: number): Response {
  const errorResponse: ErrorDto = {
    message,
    code,
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * GET /api/appointments/{id}
 * Retrieves detailed information about a single appointment by its ID
 *
 * Access Control:
 * - Clients can only view their own appointments
 * - Staff can view all appointments
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Validate appointment ID parameter
    const appointmentId = context.params.id;
    const validation = validateAppointmentId(appointmentId);

    if (!validation.success) {
      return createErrorResponse(validation.error.message, validation.error.code || "VALIDATION_ERROR", 400);
    }

    const validatedId = validation.data;

    // Step 2: Hardcoded user data for testing (auth skipped as requested)
    // TODO: Replace with real authentication when middleware is ready
    const testUserId = "e4ca431b-b0da-4683-8765-c624f8c5651a"; // CLIENT_USER_ID
    const testUserRole: "client" | "staff" = "staff"; // Change to "client" to test client access

    // Step 3: Get appointment from service with authorization
    const result = await appointmentService.getAppointmentById(validatedId, testUserId, testUserRole);

    // Step 4: Handle service response with specific error mapping
    if (!result.success) {
      switch (result.error.code) {
        case "NOT_FOUND":
          return createErrorResponse(result.error.message, "NOT_FOUND", 404);

        case "ACCESS_DENIED":
          return createErrorResponse(result.error.message, "ACCESS_DENIED", 403);

        case "DATABASE_ERROR":
          return createErrorResponse(
            "A database error occurred while retrieving the appointment",
            "DATABASE_ERROR",
            500
          );

        default:
          return createErrorResponse("An unexpected error occurred", "UNKNOWN_ERROR", 500);
      }
    }

    // Step 5: Validate response data before sending
    const responseValidation = validateAppointmentResponse(result.data);
    if (!responseValidation.success) {
      console.error("Response validation failed for appointment:", validatedId);
      return createErrorResponse(responseValidation.error.message, responseValidation.error.code || "DATA_ERROR", 500);
    }

    // Step 6: Return successful response
    return new Response(JSON.stringify(responseValidation.data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate", // Prevent caching of medical data
      },
    });
  } catch (error) {
    // Comprehensive error logging
    console.error("Unexpected error in GET /appointments/:id:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      appointmentId: context.params.id,
      timestamp: new Date().toISOString(),
    });

    return createErrorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
};
