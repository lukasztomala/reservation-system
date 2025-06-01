import type { ChatMessage, CompletionRequest } from "../types";
import { ValidationError } from "../types";
import { sanitizeContent, validateContentLength, normalizeWhitespace } from "../utils/sanitizer";

/**
 * MessageBuilder is responsible for constructing chat messages for the OpenRouter API
 * It handles content sanitization, validation, and formatting
 */
export class MessageBuilder {
  private readonly MAX_CONTENT_LENGTH = 50000;

  /**
   * Builds chat messages array from completion request
   * @param request - The completion request containing message data
   * @returns Array of chat messages ready for API submission
   */
  build(request: CompletionRequest): ChatMessage[] {
    // Guard clause for invalid request
    if (!request) {
      throw new ValidationError("Request cannot be null or undefined");
    }

    if (!request.userMessage) {
      throw new ValidationError("User message is required");
    }

    const messages: ChatMessage[] = [];

    // Add system message if provided
    if (request.system) {
      try {
        messages.push({
          role: "system",
          content: this.processContent(request.system),
        });
      } catch (error) {
        throw new ValidationError(
          `System message validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Add user message (required)
    try {
      messages.push({
        role: "user",
        content: this.processContent(request.userMessage),
      });
    } catch (error) {
      throw new ValidationError(
        `User message validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    return messages;
  }

  /**
   * Processes content by applying sanitization, length validation, and normalization
   * @param content - Raw content to process
   * @returns Processed and safe content
   * @private
   */
  private processContent(content: string): string {
    // Guard clause for empty content
    if (!content || typeof content !== "string") {
      throw new ValidationError("Content must be a non-empty string");
    }

    // 1. Sanitize HTML/XSS
    const sanitized = sanitizeContent(content);

    // 2. Check length
    validateContentLength(sanitized, this.MAX_CONTENT_LENGTH);

    // 3. Normalize whitespace and trim
    const normalized = normalizeWhitespace(sanitized);

    // Final validation
    if (!normalized) {
      throw new ValidationError("Content cannot be empty after processing");
    }

    return normalized;
  }

  /**
   * Gets the maximum allowed content length
   * @returns Maximum content length in characters
   */
  public getMaxContentLength(): number {
    return this.MAX_CONTENT_LENGTH;
  }

  /**
   * Validates a single message for completeness and safety
   * @param message - The message to validate
   * @returns True if message is valid
   */
  public validateMessage(message: ChatMessage): boolean {
    if (!message) {
      return false;
    }

    if (!["system", "user", "assistant"].includes(message.role)) {
      return false;
    }

    if (!message.content || typeof message.content !== "string") {
      return false;
    }

    if (message.content.length > this.MAX_CONTENT_LENGTH) {
      return false;
    }

    return true;
  }

  /**
   * Builds a single message with the specified role and content
   * @param role - The message role
   * @param content - The message content
   * @returns Formatted chat message
   * @private
   */
  private buildMessage(role: "system" | "user" | "assistant", content: string): ChatMessage {
    return {
      role,
      content: this.processContent(content),
    };
  }

  /**
   * Builds a complete messages array from a request
   * @param request - The completion request
   * @returns Array of chat messages
   */
  public buildMessages(request: CompletionRequest): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Add system message if provided
    if (request.system) {
      messages.push(this.buildMessage("system", request.system));
    }

    // Add existing messages if provided
    if (request.messages && request.messages.length > 0) {
      for (const message of request.messages) {
        messages.push(this.buildMessage(message.role, message.content));
      }
    }

    // Add user message if provided
    if (request.userMessage) {
      messages.push(this.buildMessage("user", request.userMessage));
    }

    return messages;
  }
}
