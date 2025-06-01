import { z } from "zod";

/**
 * Validation schema for AI recommendations request
 */
export const AIRecommendationRequestSchema = z
  .object({
    type: z.enum(["all_notes", "single_note"], {
      errorMap: () => ({ message: "Type must be either 'all_notes' or 'single_note'" }),
    }),
    patient_id: z
      .string({
        required_error: "Patient ID is required",
        invalid_type_error: "Patient ID must be a string",
      })
      .uuid("Patient ID must be a valid UUID"),
    note_id: z
      .string()
      .uuid("Note ID must be a valid UUID")
      .optional(),
  })
  .refine(
    (data) => {
      // If type is 'single_note', note_id is required
      if (data.type === "single_note" && !data.note_id) {
        return false;
      }
      return true;
    },
    {
      message: "note_id is required when type is 'single_note'",
      path: ["note_id"],
    }
  );

export type AIRecommendationRequestInput = z.infer<typeof AIRecommendationRequestSchema>;

/**
 * Validation schema for staff role authorization
 */
export const StaffAuthorizationSchema = z.object({
  id: z.string().uuid("User ID must be a valid UUID"),
  role: z
    .string()
    .refine(
      (role) => role === "staff",
      {
        message: "Only staff members can access AI recommendations",
      }
    ),
});

export type StaffAuthorizationInput = z.infer<typeof StaffAuthorizationSchema>;

/**
 * Helper function to validate AI recommendation request
 */
export function validateAIRecommendationRequest(data: unknown) {
  return AIRecommendationRequestSchema.safeParse(data);
}

/**
 * Helper function to validate staff authorization
 */
export function validateStaffAuthorization(data: unknown) {
  return StaffAuthorizationSchema.safeParse(data);
} 