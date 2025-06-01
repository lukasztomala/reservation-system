import { z } from "zod";

// Schema for creating a new note
export const createNoteRequestSchema = z.object({
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(5000, "Content cannot exceed 5000 characters")
    .trim(),
});

// Schema for updating a note
export const updateNoteRequestSchema = z.object({
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(5000, "Content cannot exceed 5000 characters")
    .trim(),
});

// Schema for appointment ID path parameter
export const appointmentIdParamSchema = z.object({
  appointment_id: z.string().uuid("Invalid appointment ID format"),
});

// Schema for note ID path parameter
export const noteIdParamSchema = z.object({
  note_id: z.string().uuid("Invalid note ID format"),
});

// Schema for notes list query parameters
export const notesListQuerySchema = z.object({
  author_role: z.enum(["client", "staff"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Types derived from schemas
export type CreateNoteRequest = z.infer<typeof createNoteRequestSchema>;
export type UpdateNoteRequest = z.infer<typeof updateNoteRequestSchema>;
export type AppointmentIdParam = z.infer<typeof appointmentIdParamSchema>;
export type NoteIdParam = z.infer<typeof noteIdParamSchema>;
export type NotesListQuery = z.infer<typeof notesListQuerySchema>; 