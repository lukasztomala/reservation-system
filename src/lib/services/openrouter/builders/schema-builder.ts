import { z } from "zod";
import type { ResponseFormat, JsonSchema } from "../types";
import { ValidationError } from "../types";

/**
 * SchemaBuilder is responsible for converting Zod schemas to JSON Schema format
 * required by OpenRouter API for structured responses
 */
export class SchemaBuilder {
  /**
   * Builds a complete ResponseFormat object from Zod schema
   * @param zodSchema - The Zod schema to convert
   * @param name - The name for the JSON schema
   * @returns ResponseFormat object ready for API submission
   */
  buildJsonSchema<T>(zodSchema: z.ZodSchema<T>, name: string): ResponseFormat {
    // Guard clauses
    if (!zodSchema) {
      throw new ValidationError("Schema cannot be null or undefined");
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new ValidationError("Schema name must be a non-empty string");
    }

    try {
      const jsonSchema = this.zodToJsonSchema(zodSchema);

      return {
        type: "json_schema",
        json_schema: {
          name: name.trim(),
          strict: true,
          schema: jsonSchema,
        },
      };
    } catch (error) {
      throw new ValidationError(
        `Failed to build JSON schema: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Converts a Zod schema to JSON Schema format
   * @param schema - The Zod schema to convert
   * @returns JSON Schema object
   * @private
   */
  private zodToJsonSchema(schema: z.ZodSchema): JsonSchema {
    // Handle ZodString
    if (schema instanceof z.ZodString) {
      const result: JsonSchema = { type: "string" };

      // Add constraints if available
      if (schema._def.checks) {
        const checks = schema._def.checks;
        for (const check of checks) {
          if (check.kind === "min") {
            (result as any).minLength = check.value;
          }
          if (check.kind === "max") {
            (result as any).maxLength = check.value;
          }
        }
      }

      return result;
    }

    // Handle ZodNumber
    if (schema instanceof z.ZodNumber) {
      const result: JsonSchema = { type: "number" };

      // Add constraints if available
      if (schema._def.checks) {
        const checks = schema._def.checks;
        for (const check of checks) {
          if (check.kind === "min") {
            (result as any).minimum = check.value;
          }
          if (check.kind === "max") {
            (result as any).maximum = check.value;
          }
        }
      }

      return result;
    }

    // Handle ZodBoolean
    if (schema instanceof z.ZodBoolean) {
      return { type: "boolean" };
    }

    // Handle ZodObject
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        try {
          properties[key] = this.zodToJsonSchema(value as z.ZodSchema);

          // Check if field is required (not optional)
          if (!this.isOptionalField(value as z.ZodSchema)) {
            required.push(key);
          }
        } catch (error) {
          throw new ValidationError(
            `Failed to process property '${key}': ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      const result: JsonSchema = {
        type: "object",
        properties,
      };

      if (required.length > 0) {
        result.required = required;
      }

      return result;
    }

    // Handle ZodArray
    if (schema instanceof z.ZodArray) {
      try {
        const items = this.zodToJsonSchema(schema.element);
        const result: JsonSchema = {
          type: "array",
          items,
        };

        // Add constraints if available
        if (schema._def.minLength !== null) {
          (result as any).minItems = schema._def.minLength.value;
        }
        if (schema._def.maxLength !== null) {
          (result as any).maxItems = schema._def.maxLength.value;
        }

        return result;
      } catch (error) {
        throw new ValidationError(
          `Failed to process array items: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Handle ZodOptional
    if (schema instanceof z.ZodOptional) {
      return this.zodToJsonSchema(schema.unwrap());
    }

    // Handle ZodNullable
    if (schema instanceof z.ZodNullable) {
      const innerSchema = this.zodToJsonSchema(schema.unwrap());
      // JSON Schema handles nullable via anyOf
      return {
        anyOf: [innerSchema, { type: "null" }],
      } as any;
    }

    // Handle ZodUnion (limited support)
    if (schema instanceof z.ZodUnion) {
      const options = schema._def.options;
      if (options.length === 2 && options.some((opt: any) => opt instanceof z.ZodLiteral)) {
        // Handle string literal unions as enum
        const literals = options.filter((opt: any) => opt instanceof z.ZodLiteral).map((opt: any) => opt._def.value);

        if (literals.length > 0) {
          return {
            type: "string",
            enum: literals,
          } as any;
        }
      }

      throw new ValidationError(
        "Complex unions are not supported. Use simple string literal unions or separate schemas."
      );
    }

    // Handle ZodLiteral
    if (schema instanceof z.ZodLiteral) {
      const value = schema._def.value;
      if (typeof value === "string") {
        return {
          type: "string",
          enum: [value],
        } as any;
      }
      if (typeof value === "number") {
        return {
          type: "number",
          enum: [value],
        } as any;
      }
      if (typeof value === "boolean") {
        return {
          type: "boolean",
          enum: [value],
        } as any;
      }
    }

    throw new ValidationError(`Unsupported schema type: ${schema.constructor.name}`);
  }

  /**
   * Checks if a Zod schema field is optional
   * @param schema - The schema to check
   * @returns True if the field is optional
   * @private
   */
  private isOptionalField(schema: z.ZodSchema): boolean {
    return (
      schema instanceof z.ZodOptional ||
      (schema instanceof z.ZodNullable && schema.unwrap() instanceof z.ZodOptional) ||
      schema.isOptional?.() === true
    );
  }

  /**
   * Validates that a schema is suitable for structured responses
   * @param schema - The schema to validate
   * @returns True if schema is valid
   */
  public validateSchema(schema: z.ZodSchema): boolean {
    try {
      this.zodToJsonSchema(schema);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets supported Zod schema types
   * @returns Array of supported schema type names
   */
  public getSupportedTypes(): string[] {
    return [
      "ZodString",
      "ZodNumber",
      "ZodBoolean",
      "ZodObject",
      "ZodArray",
      "ZodOptional",
      "ZodNullable",
      "ZodLiteral",
      "ZodUnion (limited)",
    ];
  }
}
