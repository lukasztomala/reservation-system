import { z } from "zod";
import type { ApiResponse, CompletionResponse } from "../types";
import { ValidationError, ParsingError } from "../types";

/**
 * ResponseParser is responsible for parsing and validating OpenRouter API responses
 * It handles both structured and unstructured responses with comprehensive error checking
 */
export class ResponseParser {
  /**
   * Parses an API response with optional schema validation
   * @param response - The raw API response
   * @param schema - Optional Zod schema for validation
   * @returns Parsed completion response
   */
  parse(response: ApiResponse, schema?: z.ZodSchema): CompletionResponse {
    // Guard clause for response
    if (!response) {
      throw new ParsingError("Response cannot be null or undefined");
    }

    try {
      // 1. Validate basic response structure
      this.validateResponseStructure(response);

      // 2. Extract content
      const content = this.extractContent(response);

      // 3. Parse structured response if schema provided
      if (schema) {
        const parsedContent = this.parseStructured(content, schema);
        return {
          content: JSON.stringify(parsedContent),
          usage: response.usage,
          model: response.model,
        };
      }

      // 4. Return unstructured response
      return {
        content,
        usage: response.usage,
        model: response.model,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ParsingError) {
        throw error;
      }

      throw new ParsingError(
        `Failed to parse response: ${error instanceof Error ? error.message : "Unknown error"}`,
        undefined,
        error
      );
    }
  }

  /**
   * Parses structured content using Zod schema validation
   * @param content - The content to parse
   * @param schema - Zod schema for validation
   * @returns Validated parsed content
   */
  parseStructured<T>(content: string, schema: z.ZodSchema<T>): T {
    // Guard clauses
    if (!content || typeof content !== "string") {
      throw new ParsingError("Content must be a non-empty string");
    }

    if (!schema) {
      throw new ValidationError("Schema is required for structured parsing");
    }

    try {
      // Parse JSON
      const parsed = JSON.parse(content);

      // Validate against schema
      const result = schema.parse(parsed);

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");

        throw new ValidationError(`Response validation failed: ${errorMessages}`, error.errors);
      }

      if (error instanceof SyntaxError) {
        throw new ParsingError(`Invalid JSON in response: ${error.message}`, undefined, error);
      }

      throw new ParsingError(
        `Failed to parse structured response: ${error instanceof Error ? error.message : "Unknown error"}`,
        undefined,
        error
      );
    }
  }

  /**
   * Validates the basic structure of an API response
   * @param response - The API response to validate
   * @private
   */
  private validateResponseStructure(response: ApiResponse): void {
    // Check required fields
    if (!response.id || typeof response.id !== "string") {
      throw new ParsingError("Response missing valid 'id' field");
    }

    if (!response.model || typeof response.model !== "string") {
      throw new ParsingError("Response missing valid 'model' field");
    }

    if (!response.choices || !Array.isArray(response.choices)) {
      throw new ParsingError("Response missing valid 'choices' array");
    }

    if (response.choices.length === 0) {
      throw new ParsingError("Response has empty choices array");
    }

    // Validate first choice structure
    const firstChoice = response.choices[0];
    if (!firstChoice) {
      throw new ParsingError("First choice is missing");
    }

    if (typeof firstChoice.index !== "number") {
      throw new ParsingError("Choice missing valid 'index' field");
    }

    if (!firstChoice.message) {
      throw new ParsingError("Choice missing 'message' field");
    }

    if (!firstChoice.message.role || typeof firstChoice.message.role !== "string") {
      throw new ParsingError("Choice message missing valid 'role' field");
    }

    if (typeof firstChoice.message.content !== "string") {
      throw new ParsingError("Choice message missing valid 'content' field");
    }

    if (!firstChoice.finish_reason || typeof firstChoice.finish_reason !== "string") {
      throw new ParsingError("Choice missing valid 'finish_reason' field");
    }

    // Validate usage if present
    if (response.usage) {
      if (
        typeof response.usage.prompt_tokens !== "number" ||
        typeof response.usage.completion_tokens !== "number" ||
        typeof response.usage.total_tokens !== "number"
      ) {
        throw new ParsingError("Response has invalid usage statistics");
      }
    }
  }

  /**
   * Extracts content from the first choice in the response
   * @param response - The API response
   * @returns Extracted content string
   */
  public extractContent(response: ApiResponse): string {
    const choice = response.choices[0];
    const content = choice.message?.content;

    if (!content) {
      throw new ParsingError("No content found in response");
    }

    if (typeof content !== "string") {
      throw new ParsingError("Content is not a string");
    }

    return content.trim();
  }

  /**
   * Checks if a response appears to be structured JSON
   * @param content - The content to check
   * @returns True if content appears to be JSON
   */
  public isStructuredResponse(content: string): boolean {
    if (!content || typeof content !== "string") {
      return false;
    }

    const trimmed = content.trim();
    return (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
  }

  /**
   * Validates that a response is complete and not truncated
   * @param response - The API response to check
   * @returns True if response appears complete
   */
  public isResponseComplete(response: ApiResponse): boolean {
    if (!response.choices || response.choices.length === 0) {
      return false;
    }

    const firstChoice = response.choices[0];
    const finishReason = firstChoice.finish_reason;

    // Consider response complete if it finished normally or reached max tokens
    return finishReason === "stop" || finishReason === "length";
  }

  /**
   * Gets detailed parsing statistics from a response
   * @param response - The API response
   * @returns Object with parsing statistics
   */
  public getParsingStats(response: ApiResponse): {
    contentLength: number;
    tokenUsage?: {
      prompt: number;
      completion: number;
      total: number;
    };
    finishReason: string;
    isComplete: boolean;
  } {
    try {
      const content = this.extractContent(response);
      const firstChoice = response.choices[0];

      return {
        contentLength: content.length,
        tokenUsage: response.usage
          ? {
              prompt: response.usage.prompt_tokens,
              completion: response.usage.completion_tokens,
              total: response.usage.total_tokens,
            }
          : undefined,
        finishReason: firstChoice.finish_reason,
        isComplete: this.isResponseComplete(response),
      };
    } catch {
      return {
        contentLength: 0,
        finishReason: "error",
        isComplete: false,
      };
    }
  }
}
