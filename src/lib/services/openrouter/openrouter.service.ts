import type {
  Configuration,
  CompletionRequest,
  CompletionResponse,
  StructuredRequest,
  StructuredResponse,
  ApiResponse,
  ErrorContext,
} from "./types";
import { ServiceError, NetworkError, TimeoutError, ApiError, ValidationError } from "./types";
import { MessageBuilder } from "./builders/message-builder";
import { SchemaBuilder } from "./builders/schema-builder";
import { ResponseParser } from "./parsers/response-parser";
import { RetryHandler } from "./utils/retry";

/**
 * OpenRouterService provides a robust interface to the OpenRouter.ai API
 * with built-in retry logic, error handling, and response validation
 */
export class OpenRouterService {
  private readonly config: Configuration;
  private readonly messageBuilder: MessageBuilder;
  private readonly schemaBuilder: SchemaBuilder;
  private readonly responseParser: ResponseParser;
  private readonly retryHandler: RetryHandler;

  constructor(config: Partial<Configuration> = {}) {
    // Validate required API key - use import.meta.env for Astro compatibility
    const apiKey = config.apiKey || import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new ServiceError(
        "OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable or pass it in config."
      );
    }

    // Initialize configuration with defaults
    this.config = {
      apiKey,
      baseUrl: config.baseUrl || "https://openrouter.ai/api/v1",
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      defaultModel: config.defaultModel || "opengvlab/internvl3-14b:free",
      defaultMaxTokens: config.defaultMaxTokens || 1000,
      defaultTemperature: config.defaultTemperature || 0.7,
      ...config,
    };

    // Initialize components
    this.messageBuilder = new MessageBuilder();
    this.schemaBuilder = new SchemaBuilder();
    this.responseParser = new ResponseParser();
    this.retryHandler = new RetryHandler(this.config.maxRetries);
  }

  /**
   * Generates a completion using the OpenRouter API
   * @param request - The completion request configuration
   * @returns Promise<CompletionResponse>
   */
  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const requestId = this.generateRequestId();
    const model = request.model || this.config.defaultModel;

    try {
      // Validate request
      this.validateCompletionRequest(request);

      // Build messages
      const messages = this.messageBuilder.buildMessages(request);

      // Prepare API payload
      const payload = {
        model,
        messages,
        max_tokens: request.maxTokens || this.config.defaultMaxTokens,
        temperature: request.temperature ?? this.config.defaultTemperature,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stop,
        stream: false,
      };

      // Execute with retry logic
      const errorContext: ErrorContext = {
        method: "generateCompletion",
        requestId,
        model,
      };

      const apiResponse = await this.retryHandler.execute(() => this.makeApiRequest(payload, requestId), errorContext);

      // Parse and validate response
      const parsedResponse = this.responseParser.parse(apiResponse);

      return {
        ...parsedResponse,
        requestId,
        model: typeof model === "string" ? model : model,
      };
    } catch (error) {
      throw this.handleError(error, {
        method: "generateCompletion",
        requestId,
        model: typeof model === "string" ? model : model,
      });
    }
  }

  /**
   * Generates a structured response using JSON Schema
   * @param request - The structured request configuration
   * @returns Promise<StructuredResponse<T>>
   */
  async generateStructuredResponse<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
    const requestId = this.generateRequestId();
    const model = request.model || this.config.defaultModel;

    try {
      // Validate request
      this.validateStructuredRequest(request);

      // Build JSON Schema for response format
      const responseFormat = this.schemaBuilder.buildJsonSchema(request.schema, request.schemaName || "response");

      // Build messages
      const messages = this.messageBuilder.buildMessages(request);

      // Prepare API payload with structured output
      const payload = {
        model,
        messages,
        max_tokens: request.maxTokens || this.config.defaultMaxTokens,
        temperature: request.temperature ?? this.config.defaultTemperature,
        response_format: responseFormat,
        stream: false,
      };

      // Execute with retry logic
      const errorContext: ErrorContext = {
        method: "generateStructuredResponse",
        requestId,
        model: typeof model === "string" ? model : model,
      };

      const apiResponse = await this.retryHandler.execute(() => this.makeApiRequest(payload, requestId), errorContext);

      // Parse and validate structured response
      const content = this.responseParser.extractContent(apiResponse);
      const parsedData = this.responseParser.parseStructured(content, request.schema);

      return {
        data: parsedData,
        content,
        requestId,
        model: typeof model === "string" ? model : model,
        usage: apiResponse.usage,
        finish_reason: apiResponse.choices[0]?.finish_reason || "stop",
      };
    } catch (error) {
      throw this.handleError(error, {
        method: "generateStructuredResponse",
        requestId,
        model: typeof model === "string" ? model : model,
      });
    }
  }

  /**
   * Makes the actual HTTP request to the OpenRouter API
   * @param payload - The request payload
   * @param requestId - Unique request identifier
   * @returns Promise<ApiResponse>
   * @private
   */
  private async makeApiRequest(payload: unknown, requestId: string): Promise<ApiResponse> {
    const url = `${this.config.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "HTTP-Referer": "https://reservation-system.local",
          "X-Title": "Reservation System",
          "X-Request-ID": requestId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: unknown;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new ApiError(`Invalid JSON response from OpenRouter API`, response.status, {
          method: "makeApiRequest",
          requestId,
          responseText: responseText.substring(0, 200),
        });
      }

      if (!response.ok) {
        throw new ApiError(`OpenRouter API error: ${response.status} ${response.statusText}`, response.status, {
          method: "makeApiRequest",
          requestId,
          response: responseData,
        });
      }

      return responseData as ApiResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(`Request timeout after ${this.config.timeout}ms`, {
          method: "makeApiRequest",
          requestId,
        });
      }

      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new NetworkError("Network error occurred while calling OpenRouter API", {
          method: "makeApiRequest",
          requestId,
        });
      }

      throw new ServiceError("Unexpected error occurred during API request", {
        method: "makeApiRequest",
        requestId,
      });
    }
  }

  /**
   * Validates a completion request
   * @param request - The request to validate
   * @private
   */
  private validateCompletionRequest(request: CompletionRequest): void {
    if (!request.system && !request.messages?.length && !request.userMessage) {
      throw new ValidationError("At least one of system, userMessage, or messages must be provided");
    }

    if (request.maxTokens !== undefined && (request.maxTokens < 1 || request.maxTokens > 8192)) {
      throw new ValidationError("maxTokens must be between 1 and 8192");
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new ValidationError("temperature must be between 0 and 2");
    }
  }

  /**
   * Validates a structured request
   * @param request - The request to validate
   * @private
   */
  private validateStructuredRequest<T>(request: StructuredRequest<T>): void {
    // First validate as a completion request
    this.validateCompletionRequest(request);

    // Additional validation for structured requests
    if (!request.schema) {
      throw new ValidationError("schema is required for structured responses");
    }

    if (!request.schemaName || request.schemaName.trim().length === 0) {
      throw new ValidationError("schemaName is required and cannot be empty");
    }

    // Validate that the schema is suitable for structured responses
    this.schemaBuilder.validateSchema(request.schema);
  }

  /**
   * Handles and categorizes errors
   * @param error - The error to handle
   * @param context - Error context
   * @returns ServiceError
   * @private
   */
  private handleError(error: unknown, context: ErrorContext): ServiceError {
    // If it's already one of our custom errors, return it
    if (error instanceof ServiceError) {
      return error;
    }

    // Handle known error types
    if (error instanceof Error) {
      return new ServiceError(`${context.method} failed: ${error.message}`, { ...context });
    }

    // Handle unknown errors
    return new ServiceError(`${context.method} failed with unknown error`, { ...context });
  }

  /**
   * Generates a unique request ID
   * @returns string
   * @private
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gets the current service configuration
   * @returns Configuration
   */
  public getConfig(): Configuration {
    return { ...this.config };
  }
}
