import type { APIRoute } from "astro";
import { z } from "zod";
import type {
  ErrorDto,
  ValidationErrorDto,
  PatientNotesRequestDto,
  PatientNotesResponseDto,
  UserRole,
} from "../../types";
import { NotesService } from "../../lib/services/notes.service";
import { patientNotesQuerySchema } from "../../lib/validations/notes";

export const prerender = false;

// Initialize service
const notesService = new NotesService();

/**
 * Validates query parameters for patient notes request
 */
function validateQueryParams(
  url: URL
): { success: true; data: PatientNotesRequestDto } | { success: false; error: ValidationErrorDto } {
  try {
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedData = patientNotesQuerySchema.parse(queryParams);
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
          message: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          field_errors: fieldErrors,
        },
      };
    }

    return {
      success: false,
      error: {
        message: "Query parameter validation failed",
        code: "VALIDATION_ERROR",
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
function createSuccessResponse(data: PatientNotesResponseDto, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

/**
 * GET /api/notes
 * Retrieves all notes for a specific patient across all their appointments
 *
 * Access Control:
 * - Only staff members can access patient notes
 *
 * Query Parameters:
 * - patient_id: string (required, UUID) - ID of the patient
 * - page: number (optional, default: 1) - Page number for pagination
 * - limit: number (optional, default: 20, max: 100) - Number of items per page
 * - sort: string (optional, default: "created_at") - Field to sort by
 * - order: string (optional, default: "desc") - Sort order (asc/desc)
 *
 * Responses:
 * - 200: Notes retrieved successfully
 * - 400: Invalid query parameters
 * - 401: Unauthorized (when middleware is implemented)
 * - 403: Access denied - staff access required
 * - 404: Patient not found
 * - 500: Internal server error
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Validate query parameters
    const url = new URL(context.request.url);
    const queryValidation = validateQueryParams(url);
    if (!queryValidation.success) {
      return createErrorResponse(queryValidation.error, 400);
    }
    const queryData = queryValidation.data;

    // Step 2: Authentication (hardcoded for testing - TODO: implement middleware)
    // TODO: Replace with real authentication from context.locals.supabase when middleware is ready
    const testUserId = "721a5ad5-aebb-4c67-8d4d-c5423995b61e"; // STAFF_USER_ID
    const testUserRole: UserRole = "staff"; // Only staff can access patient notes

    // Step 3: Call service to get patient notes
    const result = await notesService.getPatientNotes(queryData, testUserId, testUserRole);

    // Step 4: Handle service response with specific error mapping
    if (!result.success) {
      switch (result.error.code) {
        case "ACCESS_DENIED":
          return createErrorResponse(
            {
              message: result.error.message,
              code: "ACCESS_DENIED",
            },
            403
          );

        case "NOT_FOUND":
          return createErrorResponse(
            {
              message: result.error.message,
              code: "NOT_FOUND",
            },
            404
          );

        case "DATABASE_ERROR":
          return createErrorResponse(
            {
              message: "Failed to retrieve patient notes due to database error",
              code: "DATABASE_ERROR",
            },
            500
          );

        case "INTERNAL_ERROR":
        default:
          return createErrorResponse(
            {
              message: "An unexpected error occurred while retrieving patient notes",
              code: "INTERNAL_ERROR",
            },
            500
          );
      }
    }

    // Step 5: Return successful response with patient notes data
    return createSuccessResponse(result.data, 200);
  } catch (error) {
    // Comprehensive error logging
    console.error("Unexpected error in GET /api/notes:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: context.request.url,
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