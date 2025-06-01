import { ValidationError } from "../types";

/**
 * Sanitizes content to prevent XSS and injection attacks
 * @param content - The content to sanitize
 * @returns Sanitized content
 */
export function sanitizeContent(content: string): string {
  if (!content || typeof content !== "string") {
    throw new ValidationError("Content must be a non-empty string");
  }

  // Basic HTML entity encoding to prevent XSS
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  // Replace HTML entities
  let sanitized = content.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);

  // Remove potential script injections
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove javascript: urls
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: urls that could contain executable content
  sanitized = sanitized.replace(/data:(?!image\/)[^;]+;base64,/gi, "");

  // Remove potentially dangerous HTML attributes
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");

  return sanitized;
}

/**
 * Validates content length
 * @param content - The content to validate
 * @param maxLength - Maximum allowed length
 */
export function validateContentLength(content: string, maxLength: number): void {
  if (content.length > maxLength) {
    throw new ValidationError(`Content too long: ${content.length} chars (max: ${maxLength})`);
  }
}

/**
 * Trims and normalizes whitespace
 * @param content - The content to normalize
 * @returns Normalized content
 */
export function normalizeWhitespace(content: string): string {
  return content.trim().replace(/\s+/g, " ");
}
