// Main service export
export { OpenRouterService } from "./openrouter.service";

// Type exports
export type {
  Configuration,
  CompletionRequest,
  CompletionResponse,
  StructuredRequest,
  StructuredResponse,
  ChatMessage,
  ModelParameters,
  ApiResponse,
  UsageStatistics,
  ErrorContext,
} from "./types";

// Value exports
export { SupportedModel } from "./types";

// Error exports
export {
  ServiceError,
  ValidationError,
  NetworkError,
  TimeoutError,
  ApiError,
  RateLimitError,
  ParsingError,
  ErrorType,
} from "./types";

// Model configuration exports
export { ModelManager, MODEL_CONFIGS } from "./config/models";
export type { ModelConfig, ModelCapabilities } from "./config/models";

// Utility exports
export { MessageBuilder } from "./builders/message-builder";
export { SchemaBuilder } from "./builders/schema-builder";
export { ResponseParser } from "./parsers/response-parser";
export { RetryHandler } from "./utils/retry";

// Create singleton instance
import { OpenRouterService } from "./openrouter.service";
const openRouterService = new OpenRouterService();
export default openRouterService;
