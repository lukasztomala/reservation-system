import type { APIRoute } from "astro";
import { z } from "zod";
import type {
  ErrorDto,
  ValidationErrorDto,
  CreateNoteRequestDto,
  CreateNoteResponseDto,
  CreateNoteCommand,
  UserRole,
} from "../../../../types";
import { NotesService } from "../../../../lib/services/notes.service";
import { createNoteRequestSchema, appointmentIdParamSchema } from "../../../../lib/validations/notes";

export const prerender = false;

// Initialize service
const notesService = new NotesService();

/**
 * Validates the appointment ID parameter from the URL
 */
function validateAppointmentId(
  appointmentId: string | undefined
): { success: true; data: string } | { success: false; error: ErrorDto } {
  if (!appointmentId) {
    return {
      success: false,
      error: {
        message: "Appointment ID is required",
        code: "MISSING_PARAMETER",
      },
    };
  }

  try {
    const validation = appointmentIdParamSchema.parse({ appointment_id: appointmentId });
    return { success: true, data: validation.appointment_id };
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
 * Validates the request body for creating a note
 */
async function validateRequestBody(
  request: Request
): Promise<{ success: true; data: CreateNoteRequestDto } | { success: false; error: ValidationErrorDto }> {
  try {
    const body = await request.json();
    const validatedData = createNoteRequestSchema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format field errors for better API response
      const fieldErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(err.message);
      });

      return {
        success: false,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          field_errors: fieldErrors,
        },
      };
    }

    return {
      success: false,
      error: {
        message: "Invalid JSON format",
        code: "INVALID_JSON",
      },
    };
  }
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(error: ErrorDto | ValidationErrorDto, status: number): Response {
  return new Response(JSON.stringify(error), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Creates a standardized success response
 */
function createSuccessResponse(data: CreateNoteResponseDto, status = 201): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

/**
 * POST /api/appointments/{appointment_id}/notes
 * Creates a new note for a specific appointment
 *
 * Access Control:
 * - Clients can only add notes to their own appointments
 * - Staff can add notes to appointments where they are assigned as staff
 *
 * Request Body:
 * - content: string (required, 1-5000 characters)
 *
 * Responses:
 * - 201: Note created successfully
 * - 400: Invalid request data
 * - 401: Unauthorized (when middleware is implemented)
 * - 403: Access denied to appointment
 * - 404: Appointment not found
 * - 500: Internal server error
 */
export const POST: APIRoute = async (context) => {
  try {
    // Step 1: Validate appointment ID parameter
    const appointmentIdValidation = validateAppointmentId(context.params.appointment_id);
    if (!appointmentIdValidation.success) {
      return createErrorResponse(appointmentIdValidation.error, 400);
    }
    const appointmentId = appointmentIdValidation.data;

    // Step 2: Validate request body
    const requestBodyValidation = await validateRequestBody(context.request);
    if (!requestBodyValidation.success) {
      return createErrorResponse(requestBodyValidation.error, 400);
    }
    const requestData = requestBodyValidation.data;

    // Step 3: Hardcoded user data for testing (auth will be handled by middleware)
    // TODO: Replace with real authentication from context.locals when middleware is ready
    const testUserId = "721a5ad5-aebb-4c67-8d4d-c5423995b61e"; // STAFF_USER_ID
    const testUserRole: UserRole = "staff"; // Only staff can create notes

    // Step 4: Create command object for service
    const command: CreateNoteCommand = {
      appointment_id: appointmentId,
      author_id: testUserId,
      content: requestData.content,
    };

    // Step 5: Call service to create note
    const result = await notesService.createNote(command, testUserId, testUserRole);

    // Step 6: Handle service response with specific error mapping
    if (!result.success) {
      switch (result.error.code) {
        case "NOT_FOUND":
          return createErrorResponse(
            {
              message: result.error.message,
              code: "NOT_FOUND",
            },
            404
          );

        case "ACCESS_DENIED":
          return createErrorResponse(
            {
              message: result.error.message,
              code: "ACCESS_DENIED",
            },
            403
          );

        case "DATABASE_ERROR":
          return createErrorResponse(
            {
              message: "Failed to create note due to database error",
              code: "DATABASE_ERROR",
            },
            500
          );

        case "INTERNAL_ERROR":
        default:
          return createErrorResponse(
            {
              message: "An unexpected error occurred while creating the note",
              code: "INTERNAL_ERROR",
            },
            500
          );
      }
    }

    // Step 7: Return successful response with created note data
    return createSuccessResponse(result.data, 201);
  } catch (error) {
    // Comprehensive error logging
    console.error("Unexpected error in POST /appointments/:appointment_id/notes:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      appointmentId: context.params.appointment_id,
      timestamp: new Date().toISOString(),
    });

    return createErrorResponse(
      {
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      500
    );
  }
};
