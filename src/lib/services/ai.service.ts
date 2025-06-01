import type { AIRecommendationResponseDto, AIRecommendationDto, GenerateAIRecommendationsCommand } from "../../types";
import { z } from "zod";
import openRouterService, { type CompletionRequest, type StructuredRequest, SupportedModel } from "./openrouter";

// Define the expected structure for AI recommendations
const AIRecommendationSchema = z.object({
  title: z.string(),
  points: z.array(z.string()),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  tcm_principle: z.string(),
});

const AIRecommendationsResponseSchema = z.object({
  recommendations: z.array(AIRecommendationSchema),
});

type AIRecommendationsResponse = z.infer<typeof AIRecommendationsResponseSchema>;

export class AIService {
  private readonly defaultModel = SupportedModel.GOOGLE_GEMINI_2_5_FLASH_PREVIEW;

  /**
   * Generate acupuncture recommendations based on patient notes
   */
  async generateRecommendations(command: GenerateAIRecommendationsCommand): Promise<AIRecommendationResponseDto> {
    try {
      const prompt = this.buildPrompt(command);

      // Use structured response for better reliability
      const structuredRequest: StructuredRequest<AIRecommendationsResponse> = {
        model: this.defaultModel,
        userMessage: prompt,
        schema: AIRecommendationsResponseSchema,
        schemaName: "TCMAcupunctureRecommendations",
        temperature: 0.7,
        maxTokens: 2000,
      };

      const aiResponse = await openRouterService.generateStructuredResponse(structuredRequest);

      return {
        recommendations: this.sanitizeRecommendations(
          (aiResponse as { data: AIRecommendationsResponse }).data.recommendations
        ),
        input_summary: this.generateInputSummary(command),
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("AI Service error:", error);

      // Fallback to simple completion if structured response fails
      try {
        const fallbackResponse = await this.generateFallbackRecommendations(command);
        return fallbackResponse;
      } catch (fallbackError) {
        console.error("Fallback AI Service error:", fallbackError);
        return this.generateDefaultRecommendations(command);
      }
    }
  }

  /**
   * Fallback method using simple completion
   */
  private async generateFallbackRecommendations(
    command: GenerateAIRecommendationsCommand
  ): Promise<AIRecommendationResponseDto> {
    const prompt = this.buildPrompt(command);

    const completionRequest: CompletionRequest = {
      model: this.defaultModel,
      userMessage: prompt,
      temperature: 0.7,
      maxTokens: 2000,
    };

    const response = await openRouterService.generateCompletion(completionRequest);
    const recommendations = this.parseAIResponse(response.content);

    return {
      recommendations,
      input_summary: this.generateInputSummary(command),
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate default recommendations when AI service fails
   */
  private generateDefaultRecommendations(command: GenerateAIRecommendationsCommand): AIRecommendationResponseDto {
    return {
      recommendations: [
        {
          title: "General Wellness Points",
          points: ["LI4", "ST36", "LV3"],
          reasoning:
            "Basic points for general health maintenance based on common TCM practice. Generated as fallback due to AI service unavailability.",
          confidence: 0.6,
          tcm_principle: "Harmonizing Qi and Blood",
        },
      ],
      input_summary: this.generateInputSummary(command),
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Build TCM-focused prompt for acupuncture recommendations
   */
  private buildPrompt(command: GenerateAIRecommendationsCommand): string {
    const basePrompt = `You are an expert Traditional Chinese Medicine (TCM) practitioner specializing in acupuncture. 
    
Based on the following patient notes, provide specific acupuncture point recommendations following TCM principles.

Patient Notes:
${command.notes_content.join("\n\n")}

Analysis Type: ${command.request_type}

Guidelines:
- Use standard acupuncture point notation (e.g., LI4, ST36)
- Provide 2-4 distinct recommendation categories
- Include confidence scores (0.0-1.0)
- Base reasoning on traditional TCM theory
- Consider symptom patterns, constitution, and energetic imbalances
- Keep recommendations practical and safe
- Limit total points per recommendation to 3-6 points
- Focus on commonly used, well-established points

Provide your response as structured data with recommendations, each containing:
- title: Brief description of the point category
- points: Array of acupuncture point codes
- reasoning: Detailed explanation based on TCM theory
- confidence: Numerical confidence score
- tcm_principle: Main TCM principle applied`;

    return basePrompt;
  }

  /**
   * Sanitize and validate recommendations from structured response
   */
  private sanitizeRecommendations(
    recommendations: AIRecommendationsResponse["recommendations"]
  ): AIRecommendationDto[] {
    return recommendations
      .map((rec) => {
        return {
          title: String(rec.title).substring(0, 200), // Limit title length
          points: rec.points.slice(0, 10).map((point: string) => String(point).substring(0, 20)), // Limit points
          reasoning: String(rec.reasoning || "").substring(0, 1000), // Limit reasoning length
          confidence: Math.min(Math.max(Number(rec.confidence) || 0.5, 0), 1), // Clamp confidence
          tcm_principle: String(rec.tcm_principle || "").substring(0, 200), // Limit principle length
        };
      })
      .slice(0, 5); // Limit number of recommendations
  }

  /**
   * Parse AI response and validate structure (fallback method)
   */
  private parseAIResponse(aiResponse: string): AIRecommendationDto[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error("Invalid response format from AI service");
      }

      // Validate and sanitize each recommendation
      return parsed.recommendations
        .map((rec: Record<string, unknown>, index: number) => {
          if (!rec.title || !rec.points || !Array.isArray(rec.points)) {
            throw new Error(`Invalid recommendation structure at index ${index}`);
          }

          return {
            title: String(rec.title).substring(0, 200), // Limit title length
            points: rec.points.slice(0, 10).map((point: unknown) => String(point).substring(0, 20)), // Limit points
            reasoning: String(rec.reasoning || "").substring(0, 1000), // Limit reasoning length
            confidence: Math.min(Math.max(Number(rec.confidence) || 0.5, 0), 1), // Clamp confidence
            tcm_principle: String(rec.tcm_principle || "").substring(0, 200), // Limit principle length
          };
        })
        .slice(0, 5); // Limit number of recommendations
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      // Return fallback recommendation
      return [
        {
          title: "General Wellness Points",
          points: ["LI4", "ST36", "LV3"],
          reasoning: "Basic points for general health maintenance based on common TCM practice.",
          confidence: 0.6,
          tcm_principle: "Harmonizing Qi and Blood",
        },
      ];
    }
  }

  /**
   * Generate summary of input data for response
   */
  private generateInputSummary(command: GenerateAIRecommendationsCommand): string {
    const noteCount = command.notes_content.length;
    const totalLength = command.notes_content.join("").length;

    return `Analysis of ${noteCount} note${noteCount !== 1 ? "s" : ""} (${totalLength} characters) using ${command.request_type} method`;
  }
}

export const aiService = new AIService();
