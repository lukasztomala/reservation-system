import type { ErrorContext } from "../types";
import { NetworkError, TimeoutError, RateLimitError, ApiError } from "../types";

/**
 * RetryHandler implements exponential backoff retry logic for API requests
 * It handles different error types and determines retry eligibility
 */
export class RetryHandler {
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly backoffMultiplier: number;

  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
    this.baseDelay = 1000; // 1 second base delay
    this.maxDelay = 30000; // 30 seconds max delay
    this.backoffMultiplier = 2;
  }

  /**
   * Executes a function with retry logic
   * @param operation - The async operation to execute
   * @param context - Error context for tracking
   * @returns Promise with the operation result
   */
  async execute<T>(operation: () => Promise<T>, context?: Partial<ErrorContext>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        const result = await operation();

        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          console.log(`Operation succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Update error context with attempt number
        const errorContext: ErrorContext = {
          method: context?.method || "unknown",
          requestId: context?.requestId,
          model: context?.model,
          attemptNumber: attempt,
        };

        // Don't retry on the last attempt
        if (attempt > this.maxRetries) {
          console.error(`Operation failed after ${this.maxRetries} retries`, { error, context: errorContext });
          throw this.enhanceErrorWithContext(error, errorContext);
        }

        // Check if we should retry this error
        const shouldRetry = this.shouldRetryError(error, attempt);

        if (!shouldRetry) {
          console.error(`Non-retryable error encountered`, { error, context: errorContext });
          throw this.enhanceErrorWithContext(error, errorContext);
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, error);

        console.warn(`Operation failed on attempt ${attempt}/${this.maxRetries + 1}, retrying in ${delay}ms`, {
          error: this.getErrorMessage(error),
          context: errorContext,
        });

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached, but throw the last error if it somehow is
    throw lastError;
  }

  /**
   * Determines if an error should trigger a retry
   * @param error - The error to evaluate
   * @param attemptNumber - Current attempt number
   * @returns True if the error is retryable
   * @private
   */
  private shouldRetryError(error: unknown, attemptNumber: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attemptNumber > this.maxRetries) {
      return false;
    }

    // Handle known error types
    if (error instanceof NetworkError) {
      return true;
    }

    if (error instanceof TimeoutError) {
      return true;
    }

    if (error instanceof RateLimitError) {
      return true;
    }

    if (error instanceof ApiError) {
      // Retry server errors (5xx) but not client errors (4xx)
      return error.statusCode >= 500;
    }

    // Handle fetch-specific errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return true;
    }

    // Handle AbortError (timeout)
    if (error instanceof Error && error.name === "AbortError") {
      return true;
    }

    // Handle network errors from fetch
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("network") ||
        message.includes("connection") ||
        message.includes("timeout") ||
        message.includes("econnreset") ||
        message.includes("enotfound") ||
        message.includes("econnrefused")
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculates the delay before the next retry using exponential backoff
   * @param attemptNumber - Current attempt number
   * @param error - The error that triggered the retry
   * @returns Delay in milliseconds
   * @private
   */
  private calculateDelay(attemptNumber: number, error: unknown): number {
    let baseDelay = this.baseDelay;

    // Use longer delay for rate limiting errors
    if (error instanceof RateLimitError) {
      baseDelay = 5000; // Start with 5 seconds for rate limits
    }

    // Calculate exponential backoff
    const exponentialDelay = baseDelay * Math.pow(this.backoffMultiplier, attemptNumber - 1);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000; // Up to 1 second of jitter

    // Ensure delay doesn't exceed maximum
    const totalDelay = Math.min(exponentialDelay + jitter, this.maxDelay);

    return Math.floor(totalDelay);
  }

  /**
   * Enhances an error with retry context information
   * @param error - The original error
   * @param context - The error context
   * @returns Enhanced error with context
   * @private
   */
  private enhanceErrorWithContext(error: unknown, _context: ErrorContext): unknown {
    if (
      error instanceof NetworkError ||
      error instanceof TimeoutError ||
      error instanceof RateLimitError ||
      error instanceof ApiError
    ) {
      // These errors already have context support
      return error;
    }

    // For other errors, return as-is since we can't enhance them
    return error;
  }

  /**
   * Extracts a meaningful error message from various error types
   * @param error - The error to extract message from
   * @returns Error message string
   * @private
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return "Unknown error";
  }

  /**
   * Sleep utility function
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the specified time
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets the current retry configuration
   * @returns Object with retry settings
   */
  public getConfig(): {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  } {
    return {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      backoffMultiplier: this.backoffMultiplier,
    };
  }
}
