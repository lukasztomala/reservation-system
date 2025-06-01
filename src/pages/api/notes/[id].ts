import type { APIRoute } from "astro";
import { z } from "zod";
import type {
  ErrorDto,
  ValidationErrorDto,
  UpdateNoteRequestDto,
  UpdateNoteResponseDto,
  UserRole,
} from "../../../types";
import { NotesService } from "../../../lib/services/notes.service";
import { updateNoteRequestSchema, noteIdPathParamSchema } from "../../../lib/validations/notes";

export const prerender = false;

// Initialize service
const notesService = new NotesService();

/**
 * Validates the note ID parameter from the URL
 */
function validateNoteId(
  noteId: string | undefined
): { success: true; data: string } | { success: false; error: ErrorDto } {
  if (!noteId) {
    return {
      success: false,
      error: {
        message: "Note ID is required",
        code: "MISSING_PARAMETER",
      },
    };
  }

  try {
    const validation = noteIdPathParamSchema.parse({ id: noteId });
    return { success: true, data: validation.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: error.errors[0]?.message || "Invalid note ID format",
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
 * Validates the request body for updating a note
 */
async function validateRequestBody(
  request: Request
): Promise<{ success: true; data: UpdateNoteRequestDto } | { success: false; error: ValidationErrorDto }> {
  try {
    const body = await request.json();
    const validatedData = updateNoteRequestSchema.parse(body);
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
function createSuccessResponse(data: UpdateNoteResponseDto, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

/**
 * PATCH /api/notes/{id}
 * Updates the content of an existing note
 *
 * Access Control:
 * - Users can only update their own notes (author_id must match authenticated user)
 *
 * Path Parameters:
 * - id: string (required, UUID) - ID of the note to update
 *
 * Request Body:
 * - content: string (required, 1-10000 characters) - New content for the note
 *
 * Responses:
 * - 200: Note updated successfully
 * - 400: Invalid request data (bad UUID, invalid JSON, validation errors)
 * - 401: Unauthorized (when middleware is implemented)
 * - 403: Access denied - not the author of the note
 * - 404: Note not found
 * - 500: Internal server error
 */
export const PATCH: APIRoute = async (context) => {
  try {
    // Step 1: Validate note ID parameter
    const noteIdValidation = validateNoteId(context.params.id);
    if (!noteIdValidation.success) {
      return createErrorResponse(noteIdValidation.error, 400);
    }
    const noteId = noteIdValidation.data;

    // Step 2: Validate request body
    const requestBodyValidation = await validateRequestBody(context.request);
    if (!requestBodyValidation.success) {
      return createErrorResponse(requestBodyValidation.error, 400);
    }
    const requestData = requestBodyValidation.data;

    // Step 3: Authentication (hardcoded for testing - TODO: implement middleware)
    // TODO: Replace with real authentication from context.locals.supabase when middleware is ready
    const testUserId = "721a5ad5-aebb-4c67-8d4d-c5423995b61e"; // STAFF_USER_ID
    
    // Step 4: Call service to update note
    const result = await notesService.updateNote(noteId, requestData.content, testUserId);

    // Step 5: Handle service response with specific error mapping
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
              message: "Failed to update note due to database error",
              code: "DATABASE_ERROR",
            },
            500
          );

        case "INTERNAL_ERROR":
        default:
          return createErrorResponse(
            {
              message: "An unexpected error occurred while updating the note",
              code: "INTERNAL_ERROR",
            },
            500
          );
      }
    }

    // Step 6: Return successful response with updated note data
    return createSuccessResponse(result.data, 200);
  } catch (error) {
    // Comprehensive error logging
    console.error("Unexpected error in PATCH /api/notes/:id:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      noteId: context.params.id,
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