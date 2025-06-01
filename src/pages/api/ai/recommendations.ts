import type { APIRoute } from "astro";
import { validateAIRecommendationRequest } from "../../../lib/validations/ai-recommendations";
import { patientNotesAIService } from "../../../lib/services/patient-notes-ai.service";
import { aiService } from "../../../lib/services/ai.service";
import type {
  AIRecommendationRequestDto,
  AIRecommendationResponseDto,
  ErrorDto,
  ValidationErrorDto,
} from "../../../types";

export const prerender = false;

/**
 * POST /api/ai/recommendations
 * Generates acupuncture recommendations based on patient notes using AI
 * TEMPORARY: AUTH DISABLED FOR TESTING
 */
export const POST: APIRoute = async ({ request }) => {
  console.log("🚀 AI Recommendations endpoint called");
  try {
    // Use a mock staff user ID for testing
    const mockStaffUserId = "test-staff-user-id-12345";

    // 1. Parse request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      const errorResponse: ErrorDto = {
        message: "Invalid JSON in request body",
        code: "INVALID_JSON",
      };
      return new Response(JSON.stringify({ error: errorResponse, success: false }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Validate request body
    const validationResult = validateAIRecommendationRequest(requestBody);
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
      return new Response(JSON.stringify({ error: validationError, success: false }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validatedData = validationResult.data as AIRecommendationRequestDto;

    // 3. Prepare AI recommendations command by fetching patient notes
    const commandResult = await patientNotesAIService.prepareAIRecommendationsCommand(
      validatedData.type,
      validatedData.patient_id,
      mockStaffUserId, // Use mock staff user ID
      validatedData.note_id || undefined
    );

    if (!commandResult.success) {
      // Map specific error codes to appropriate HTTP status codes
      let statusCode = 500;
      if (commandResult.error.code === "PATIENT_NOT_FOUND" || commandResult.error.code === "NOTE_NOT_FOUND") {
        statusCode = 404;
      } else if (
        commandResult.error.code === "NO_NOTES_FOUND" ||
        commandResult.error.code === "NO_VALID_CONTENT" ||
        commandResult.error.code === "EMPTY_NOTE_CONTENT"
      ) {
        statusCode = 400;
      } else if (commandResult.error.code === "INVALID_PATIENT") {
        statusCode = 400;
      }

      const errorResponse: ErrorDto = {
        message: commandResult.error.message,
        code: commandResult.error.code,
      };
      return new Response(JSON.stringify({ error: errorResponse, success: false }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Generate AI recommendations
    try {
      const aiResponse: AIRecommendationResponseDto = await aiService.generateRecommendations(commandResult.command);

      return new Response(
        JSON.stringify({
          success: true,
          data: aiResponse,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (aiError: unknown) {
      console.error("AI Service error:", aiError);

      // Handle different types of AI service errors
      let errorMessage = "Failed to generate AI recommendations";
      let errorCode = "AI_SERVICE_ERROR";
      let statusCode = 500;

      if (aiError instanceof Error) {
        if (aiError.message.includes("timeout")) {
          errorMessage = "AI service request timeout";
          errorCode = "AI_SERVICE_TIMEOUT";
          statusCode = 503;
        } else if (aiError.message.includes("API error")) {
          errorMessage = "AI service temporarily unavailable";
          errorCode = "AI_SERVICE_UNAVAILABLE";
          statusCode = 503;
        } else {
          errorMessage = aiError.message;
        }
      }

      const errorResponse: ErrorDto = {
        message: errorMessage,
        code: errorCode,
      };
      return new Response(JSON.stringify({ error: errorResponse, success: false }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    console.error("Unexpected error in AI recommendations endpoint:", error);

    const errorResponse: ErrorDto = {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    };
    return new Response(JSON.stringify({ error: errorResponse, success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
