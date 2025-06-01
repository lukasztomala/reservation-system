import { z } from "zod";

// ===== CONFIGURATION TYPES =====
export interface OpenRouterConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

// ===== MODEL TYPES =====
export enum SupportedModel {
  GOOGLE_GEMINI_2_5_FLASH_PREVIEW = "google/gemini-2.5-flash-preview-05-20",
  OPENGVLAB_INTERNVL3_14B_FREE = "opengvlab/internvl3-14b:free",
}

export interface Configuration {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  defaultModel: SupportedModel | string;
  defaultMaxTokens: number;
  defaultTemperature: number;
}

export interface ModelParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
}

export interface ModelParametersBuilder {
  setTemperature(temperature: number): ModelParametersBuilder;
  setMaxTokens(maxTokens: number): ModelParametersBuilder;
  setTopP(topP: number): ModelParametersBuilder;
  setFrequencyPenalty(penalty: number): ModelParametersBuilder;
  setPresencePenalty(penalty: number): ModelParametersBuilder;
  setStop(stop: string | string[]): ModelParametersBuilder;
  build(): ModelParameters;
}

export interface ModelConfig {
  maxTokens: number;
  defaultTemperature: number;
  supportedParameters: string[];
}

// ===== REQUEST TYPES =====
export interface CompletionRequest extends ModelParameters {
  model?: SupportedModel | string;
  system?: string;
  userMessage?: string;
  messages?: ChatMessage[];
}

export interface StructuredRequest<T> extends CompletionRequest {
  schema: z.ZodSchema<T>;
  schemaName: string;
}

// ===== RESPONSE TYPES =====
export interface UsageStatistics {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ApiChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface CompletionResponse {
  content: string;
  usage?: UsageStatistics;
  model: string;
  requestId?: string;
}

export interface StructuredResponse<T> {
  data: T;
  content: string;
  requestId: string;
  model: string;
  usage?: UsageStatistics;
  finish_reason: string;
}

// ===== API TYPES =====
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ApiPayload {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: ResponseFormat;
}

export interface ApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ApiChoice[];
  usage?: UsageStatistics;
}

export interface ApiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// ===== JSON SCHEMA TYPES =====
export interface JsonSchema extends Record<string, unknown> {
  type: "string" | "number" | "object" | "array" | "boolean";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
}

// ===== ERROR TYPES =====
export enum ErrorType {
  SERVICE_ERROR = "SERVICE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  API_ERROR = "API_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  PARSING_ERROR = "PARSING_ERROR",
}

export interface ErrorContext {
  method: string;
  requestId?: string;
  model?: string;
  attemptNumber?: number;
  [key: string]: unknown;
}

export class ServiceError extends Error {
  public readonly type: ErrorType = ErrorType.SERVICE_ERROR;
  public readonly context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = "ServiceError";
    this.context = context;
  }
}

export class ValidationError extends Error {
  public readonly type: ErrorType = ErrorType.VALIDATION_ERROR;
  public readonly validationErrors?: unknown[];

  constructor(message: string, validationErrors?: unknown[]) {
    super(message);
    this.name = "ValidationError";
    this.validationErrors = validationErrors;
  }
}

export class NetworkError extends Error {
  public readonly type: ErrorType = ErrorType.NETWORK_ERROR;
  public readonly context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = "NetworkError";
    this.context = context;
  }
}

export class TimeoutError extends Error {
  public readonly type: ErrorType = ErrorType.TIMEOUT_ERROR;
  public readonly context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = "TimeoutError";
    this.context = context;
  }
}

export class ApiError extends Error {
  public readonly type: ErrorType = ErrorType.API_ERROR;
  public readonly statusCode: number;
  public readonly context?: ErrorContext;

  constructor(message: string, statusCode: number, context?: ErrorContext) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class RateLimitError extends Error {
  public readonly type: ErrorType = ErrorType.RATE_LIMIT_ERROR;
  public readonly retryAfter?: number;
  public readonly context?: ErrorContext;

  constructor(message: string, retryAfter?: number, context?: ErrorContext) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.context = context;
  }
}

export class ParsingError extends Error {
  public readonly type: ErrorType = ErrorType.PARSING_ERROR;
  public readonly context?: ErrorContext;
  public readonly originalError?: unknown;

  constructor(message: string, context?: ErrorContext, originalError?: unknown) {
    super(message);
    this.name = "ParsingError";
    this.context = context;
    this.originalError = originalError;
  }
}

// Response format for structured outputs
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict?: boolean;
    schema: Record<string, unknown>;
  };
}
