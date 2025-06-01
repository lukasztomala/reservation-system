# OpenRouter Service - Przewodnik Implementacji

## 1. Opis Usługi

Usługa OpenRouter stanowi abstrakcję nad API OpenRouter.ai, umożliwiającą komunikację z różnymi modelami LLM w sposób zunifikowany i bezpieczny. Usługa obsługuje strukturalne odpowiedzi JSON, zarządzanie parametrami modeli oraz kompleksową obsługę błędów.

### Główne Funkcjonalności

- Komunikacja z API OpenRouter.ai
- Strukturalne odpowiedzi poprzez JSON Schema
- Zarządzanie konfiguracją modeli
- Obsługa retry logic z exponential backoff
- Centralna obsługa błędów i logowanie
- Walidacja danych wejściowych i wyjściowych
- Rate limiting i timeout handling

## 2. Opis Konstruktora

Konstruktor inicjalizuje wszystkie niezbędne komponenty usługi:

```typescript
constructor(config?: OpenRouterConfig) {
  // Walidacja i ustawienie API key
  this.apiKey = config?.apiKey || import.meta.env.OPENROUTER_API_KEY;
  this.validateApiKey();

  // Konfiguracja podstawowa
  this.baseUrl = config?.baseUrl || 'https://openrouter.ai/api/v1';
  this.timeout = config?.timeout || 30000;
  this.maxRetries = config?.maxRetries || 3;

  // Inicjalizacja komponentów
  this.messageBuilder = new MessageBuilder();
  this.responseParser = new ResponseParser();
  this.errorHandler = new ErrorHandler();
  this.configManager = new ConfigurationManager();
}
```

### Parametry Konfiguracji

- `apiKey`: Klucz API OpenRouter (domyślnie z env)
- `baseUrl`: URL bazowy API (domyślnie production)
- `timeout`: Timeout requestów w ms (domyślnie 30s)
- `maxRetries`: Maksymalna liczba prób (domyślnie 3)

## 3. Publiczne Metody i Pola

### 3.1 Główne Metody API

#### `generateCompletion(request: CompletionRequest): Promise<CompletionResponse>`

Główna metoda do generowania odpowiedzi z modelu LLM.

```typescript
async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
  // 1. Walidacja request
  const validatedRequest = this.validateCompletionRequest(request);

  // 2. Budowanie messages
  const messages = this.messageBuilder.build(validatedRequest);

  // 3. Przygotowanie payload
  const payload = this.prepareApiPayload(validatedRequest, messages);

  // 4. Wysłanie request z retry logic
  const response = await this.sendWithRetry(payload);

  // 5. Parsowanie i walidacja odpowiedzi
  return this.responseParser.parse(response, validatedRequest.responseSchema);
}
```

#### `generateStructuredResponse<T>(request: StructuredRequest<T>): Promise<T>`

Metoda do generowania strukturalnych odpowiedzi z automatyczną walidacją typu.

```typescript
async generateStructuredResponse<T>(request: StructuredRequest<T>): Promise<T> {
  const completionRequest: CompletionRequest = {
    ...request,
    responseFormat: this.buildJsonSchema(request.schema),
    temperature: request.temperature || 0.1, // Niższa temperatura dla structured responses
  };

  const response = await this.generateCompletion(completionRequest);
  return this.responseParser.parseStructured<T>(response, request.schema);
}
```

### 3.2 Metody Konfiguracyjne

#### `setModel(model: SupportedModel): void`

Ustawia aktywny model dla kolejnych requestów.

#### `setSystemMessage(message: string): void`

Ustawia systemową wiadomość dla kontekstu.

#### `addUserMessage(message: string): void`

Dodaje wiadomość użytkownika do kontekstu.

#### `setModelParameters(params: ModelParameters): void`

Konfiguruje parametry modelu (temperature, max_tokens, etc.).

### 3.3 Publiczne Pola

```typescript
public readonly supportedModels: readonly SupportedModel[];
public readonly currentModel: SupportedModel;
public readonly isHealthy: boolean;
```

## 4. Prywatne Metody i Pola

### 4.1 Komponenty Wewnętrzne

#### MessageBuilder

```typescript
private messageBuilder: MessageBuilder;

class MessageBuilder {
  build(request: CompletionRequest): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (request.systemMessage) {
      messages.push({
        role: 'system',
        content: this.sanitizeContent(request.systemMessage)
      });
    }

    messages.push({
      role: 'user',
      content: this.sanitizeContent(request.userMessage)
    });

    return messages;
  }
}
```

#### ResponseParser

```typescript
private responseParser: ResponseParser;

class ResponseParser {
  parse(response: ApiResponse, schema?: ZodSchema): CompletionResponse {
    this.validateResponseStructure(response);

    if (schema) {
      return this.parseStructured(response, schema);
    }

    return this.parseUnstructured(response);
  }
}
```

#### ConfigurationManager

```typescript
private configManager: ConfigurationManager;

class ConfigurationManager {
  getModelConfig(model: SupportedModel): ModelConfig {
    return {
      maxTokens: this.getMaxTokensForModel(model),
      supportedParameters: this.getSupportedParameters(model),
      defaultTemperature: this.getDefaultTemperature(model)
    };
  }
}
```

### 4.2 Metody Pomocnicze

#### `sendWithRetry(payload: ApiPayload): Promise<ApiResponse>`

Implementuje retry logic z exponential backoff.

#### `buildJsonSchema(zodSchema: ZodSchema): ResponseFormat`

Konwertuje Zod schema na format OpenRouter JSON Schema.

#### `validateApiKey(): void`

Waliduje poprawność klucza API.

#### `sanitizeContent(content: string): string`

Sanitizuje content przed wysłaniem do API.

## 5. Obsługa Błędów

### 5.1 Klasyfikacja Błędów

```typescript
enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  MODEL_ERROR = "MODEL_ERROR",
  PARSING_ERROR = "PARSING_ERROR",
}
```

### 5.2 Mapowanie Błędów HTTP

| Status Code | Error Type       | Retry | Description            |
| ----------- | ---------------- | ----- | ---------------------- |
| 400         | VALIDATION_ERROR | No    | Invalid request format |
| 401         | API_ERROR        | No    | Invalid API key        |
| 429         | RATE_LIMIT_ERROR | Yes   | Rate limit exceeded    |
| 500         | API_ERROR        | Yes   | Server error           |
| 503         | API_ERROR        | Yes   | Service unavailable    |
| Timeout     | TIMEOUT_ERROR    | Yes   | Request timeout        |

### 5.3 Error Handler Implementation

```typescript
class ErrorHandler {
  handle(error: unknown, context: ErrorContext): ServiceError {
    if (error instanceof NetworkError) {
      return this.handleNetworkError(error, context);
    }

    if (error instanceof ApiError) {
      return this.handleApiError(error, context);
    }

    return this.handleUnknownError(error, context);
  }

  private shouldRetry(errorType: ErrorType, attemptNumber: number): boolean {
    const retryableErrors = [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.RATE_LIMIT_ERROR];

    return retryableErrors.includes(errorType) && attemptNumber < this.maxRetries;
  }
}
```

## 6. Kwestie Bezpieczeństwa

### 6.1 Ochrona API Key

- Przechowywanie w zmiennych środowiskowych
- Walidacja formatu klucza
- Nigdy nie logowanie klucza w plaintext

### 6.2 Sanitization Danych

- HTML encoding dla user input
- Limiting długości wiadomości
- Validation przeciwko injection attacks

### 6.3 Rate Limiting

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  async checkLimit(apiKey: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(apiKey) || [];

    // Usuń requests starsze niż 1 minuta
    const recentRequests = requests.filter((time) => now - time < 60000);

    if (recentRequests.length >= this.maxRequestsPerMinute) {
      throw new RateLimitError("Rate limit exceeded");
    }

    recentRequests.push(now);
    this.requests.set(apiKey, recentRequests);
    return true;
  }
}
```

## 7. Plan Wdrożenia Krok po Kroku

### Krok 1: Przygotowanie Struktury Plików

```
src/lib/services/openrouter/
├── index.ts                 # Main service export
├── openrouter.service.ts    # Main service class
├── types.ts                 # TypeScript definitions
├── builders/
│   ├── message-builder.ts   # Message construction
│   ├── schema-builder.ts    # JSON Schema building
│   └── payload-builder.ts   # API payload construction
├── parsers/
│   ├── response-parser.ts   # Response parsing
│   └── error-parser.ts      # Error parsing
├── config/
│   ├── models.ts           # Supported models config
│   ├── parameters.ts       # Model parameters
│   └── defaults.ts         # Default configurations
└── utils/
    ├── retry.ts            # Retry logic
    ├── sanitizer.ts        # Content sanitization
    └── validator.ts        # Input validation
```

### Krok 2: Implementacja Typów

```typescript
// src/lib/services/openrouter/types.ts
export interface CompletionRequest {
  model: SupportedModel;
  systemMessage?: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ResponseFormat;
  responseSchema?: ZodSchema;
}

export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
  };
}

export type SupportedModel = "google/gemini-2.5-flash-preview-05-20" | "opengvlab/internvl3-14b:free";

export interface ModelParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}
```

### Krok 3: Implementacja Message Builder

```typescript
// src/lib/services/openrouter/builders/message-builder.ts
import { sanitizeContent } from "../utils/sanitizer";

export class MessageBuilder {
  private readonly MAX_CONTENT_LENGTH = 50000;

  build(request: CompletionRequest): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (request.systemMessage) {
      messages.push({
        role: "system",
        content: this.processContent(request.systemMessage),
      });
    }

    messages.push({
      role: "user",
      content: this.processContent(request.userMessage),
    });

    return messages;
  }

  private processContent(content: string): string {
    // 1. Sanitize HTML/XSS
    const sanitized = sanitizeContent(content);

    // 2. Check length
    if (sanitized.length > this.MAX_CONTENT_LENGTH) {
      throw new ValidationError(`Content too long: ${sanitized.length} chars`);
    }

    // 3. Trim whitespace
    return sanitized.trim();
  }
}
```

### Krok 4: Implementacja Schema Builder

```typescript
// src/lib/services/openrouter/builders/schema-builder.ts
import { z } from "zod";

export class SchemaBuilder {
  buildJsonSchema<T>(zodSchema: z.ZodSchema<T>, name: string): ResponseFormat {
    const jsonSchema = this.zodToJsonSchema(zodSchema);

    return {
      type: "json_schema",
      json_schema: {
        name: name,
        strict: true,
        schema: jsonSchema,
      },
    };
  }

  private zodToJsonSchema(schema: z.ZodSchema): JsonSchema {
    // Implementacja konwersji Zod -> JSON Schema
    // Obsługa podstawowych typów: string, number, object, array

    if (schema instanceof z.ZodString) {
      return { type: "string" };
    }

    if (schema instanceof z.ZodNumber) {
      return { type: "number" };
    }

    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodToJsonSchema(value as z.ZodSchema);
        if (!value.isOptional()) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    if (schema instanceof z.ZodArray) {
      return {
        type: "array",
        items: this.zodToJsonSchema(schema.element),
      };
    }

    throw new Error(`Unsupported schema type: ${schema.constructor.name}`);
  }
}
```

### Krok 5: Implementacja Response Parser

```typescript
// src/lib/services/openrouter/parsers/response-parser.ts
import { z } from "zod";

export class ResponseParser {
  parse(response: ApiResponse, schema?: z.ZodSchema): CompletionResponse {
    // 1. Validate basic response structure
    this.validateResponseStructure(response);

    // 2. Extract content
    const content = this.extractContent(response);

    // 3. Parse structured response if schema provided
    if (schema) {
      return this.parseStructured(content, schema);
    }

    return {
      content,
      usage: response.usage,
      model: response.model,
    };
  }

  parseStructured<T>(content: string, schema: z.ZodSchema<T>): T {
    try {
      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Response validation failed", error.errors);
      }
      throw new ParsingError("Failed to parse JSON response");
    }
  }

  private extractContent(response: ApiResponse): string {
    if (!response.choices || response.choices.length === 0) {
      throw new ParsingError("No choices in response");
    }

    const choice = response.choices[0];
    return choice.message?.content || "";
  }
}
```

### Krok 6: Implementacja Głównej Usługi

```typescript
// src/lib/services/openrouter/openrouter.service.ts
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  private messageBuilder: MessageBuilder;
  private schemaBuilder: SchemaBuilder;
  private responseParser: ResponseParser;
  private retryHandler: RetryHandler;

  constructor(config?: OpenRouterConfig) {
    this.apiKey = config?.apiKey || import.meta.env.OPENROUTER_API_KEY;
    this.validateApiKey();

    this.baseUrl = config?.baseUrl || "https://openrouter.ai/api/v1";
    this.timeout = config?.timeout || 30000;
    this.maxRetries = config?.maxRetries || 3;

    this.messageBuilder = new MessageBuilder();
    this.schemaBuilder = new SchemaBuilder();
    this.responseParser = new ResponseParser();
    this.retryHandler = new RetryHandler(this.maxRetries);
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    // 1. Validate request
    this.validateRequest(request);

    // 2. Build messages
    const messages = this.messageBuilder.build(request);

    // 3. Prepare payload
    const payload = this.buildPayload(request, messages);

    // 4. Send with retry
    const response = await this.retryHandler.execute(() => this.sendRequest(payload));

    // 5. Parse response
    return this.responseParser.parse(response, request.responseSchema);
  }

  async generateStructuredResponse<T>(request: StructuredRequest<T>): Promise<T> {
    const responseFormat = this.schemaBuilder.buildJsonSchema(request.schema, request.schemaName || "response");

    const completionRequest: CompletionRequest = {
      ...request,
      responseFormat,
      temperature: request.temperature || 0.1,
    };

    const response = await this.generateCompletion(completionRequest);
    return this.responseParser.parseStructured(response.content, request.schema);
  }

  private async sendRequest(payload: ApiPayload): Promise<ApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://your-domain.com",
          "X-Title": "Your App Name",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new TimeoutError("Request timeout");
      }

      throw error;
    }
  }
}
```

### Krok 7: Konfiguracja Modeli i Eksport

```typescript
// src/lib/services/openrouter/config/models.ts
export const SUPPORTED_MODELS = {
  "google/gemini-2.5-flash-preview-05-20": {
    maxTokens: 4096,
    defaultTemperature: 0.7,
    supportedParameters: ["temperature", "max_tokens", "top_p"],
  },
  "opengvlab/internvl3-14b:free": {
    maxTokens: 4096,
    defaultTemperature: 0.7,
    supportedParameters: ["temperature", "max_tokens", "top_p"],
  },
} as const;

// src/lib/services/openrouter/index.ts
export { OpenRouterService } from "./openrouter.service";
export type { CompletionRequest, CompletionResponse, StructuredRequest, SupportedModel } from "./types";

// Create singleton instance
export const openRouterService = new OpenRouterService();
```

### Krok 8: Integracja z Istniejącym Kodem

```typescript
// Aktualizacja src/lib/services/ai.service.ts
import { openRouterService } from "./openrouter";
import { z } from "zod";

// Schema dla structured response
const RecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      point: z.string(),
      reason: z.string(),
      technique: z.string().optional(),
    })
  ),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export class AIService {
  async generateRecommendations(command: GenerateAIRecommendationsCommand): Promise<AIRecommendationResponseDto> {
    const systemMessage = this.buildSystemMessage();
    const userMessage = this.buildUserMessage(command);

    const response = await openRouterService.generateStructuredResponse({
      model: "google/gemini-2.5-flash-preview-05-20",
      systemMessage,
      userMessage,
      schema: RecommendationSchema,
      schemaName: "acupuncture_recommendations",
      temperature: 0.3,
    });

    return this.formatResponse(response);
  }
}
```

### Krok 9: Testy Jednostkowe

```typescript
// tests/openrouter.service.test.ts
describe("OpenRouterService", () => {
  let service: OpenRouterService;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: "test-key",
      baseUrl: "http://localhost:3000",
    });
  });

  describe("generateStructuredResponse", () => {
    it("should return parsed structured response", async () => {
      const schema = z.object({
        result: z.string(),
      });

      const result = await service.generateStructuredResponse({
        model: "google/gemini-2.5-flash-preview-05-20",
        userMessage: "Test message",
        schema,
        schemaName: "test_response",
      });

      expect(result).toHaveProperty("result");
      expect(typeof result.result).toBe("string");
    });
  });
});
```

### Krok 10: Dokumentacja i Przykłady Użycia

```typescript
// Przykład użycia w endpoincie API
export const POST: APIRoute = async ({ request }) => {
  try {
    const result = await openRouterService.generateStructuredResponse({
      model: "google/gemini-2.5-flash-preview-05-20",
      systemMessage: "You are a TCM specialist.",
      userMessage: "Analyze these symptoms...",
      schema: DiagnosisSchema,
      schemaName: "tcm_diagnosis",
      temperature: 0.2,
      maxTokens: 1000,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Error handling
  }
};
```

## Podsumowanie

Ten przewodnik implementacji zapewnia kompletną strukturę dla usługi OpenRouter, która jest:

- **Skalowalna**: Modułowa architektura umożliwia łatwe rozszerzanie
- **Bezpieczna**: Kompleksowa walidacja i sanitization danych
- **Niezawodna**: Retry logic, error handling, timeout management
- **Typesafe**: Pełne wsparcie TypeScript z Zod validation
- **Testowalna**: Jasny podział odpowiedzialności i dependency injection

Implementacja ta będzie działać płynnie z istniejącym tech stackiem (Astro + TypeScript + Supabase) i zapewni solidną podstawę do komunikacji z modelami AI poprzez OpenRouter.ai.
