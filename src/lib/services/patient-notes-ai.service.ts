import type { GenerateAIRecommendationsCommand } from "../../types";
import { supabaseClient } from "../../db/supabase.client";

/**
 * Service responsible for retrieving patient notes for AI analysis
 * Contains specialized methods for gathering notes data for AI recommendations
 */
export class PatientNotesAIService {
  /**
   * Validates that a patient exists in the system
   */
  private async validatePatientExists(
    patientId: string
  ): Promise<{ success: true } | { success: false; error: { message: string; code: string } }> {
    try {
      const { data: patient, error } = await supabaseClient
        .from("users")
        .select("id, role")
        .eq("id", patientId)
        .single();

      if (error || !patient) {
        return {
          success: false,
          error: {
            message: "Patient not found",
            code: "PATIENT_NOT_FOUND",
          },
        };
      }

      // Optionally verify that this user is actually a client/patient
      if (patient.role === "staff") {
        return {
          success: false,
          error: {
            message: "Cannot generate recommendations for staff accounts",
            code: "INVALID_PATIENT",
          },
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error validating patient existence:", error);
      return {
        success: false,
        error: {
          message: "Failed to validate patient",
          code: "DATABASE_ERROR",
        },
      };
    }
  }

  /**
   * Validates that a specific note exists and belongs to the patient
   */
  private async validateNoteExists(
    noteId: string,
    patientId: string
  ): Promise<{ success: true } | { success: false; error: { message: string; code: string } }> {
    try {
      const { data: note, error } = await supabaseClient
        .from("notes")
        .select(
          `
          id,
          content,
          appointments!inner(
            client_id
          )
        `
        )
        .eq("id", noteId)
        .eq("appointments.client_id", patientId)
        .single();

      if (error || !note) {
        return {
          success: false,
          error: {
            message: "Note not found or does not belong to specified patient",
            code: "NOTE_NOT_FOUND",
          },
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error validating note existence:", error);
      return {
        success: false,
        error: {
          message: "Failed to validate note",
          code: "DATABASE_ERROR",
        },
      };
    }
  }

  /**
   * Retrieves all notes for a patient across all their appointments
   */
  private async getAllPatientNotes(
    patientId: string
  ): Promise<{ success: true; notes: string[] } | { success: false; error: { message: string; code: string } }> {
    try {
      const { data: notes, error } = await supabaseClient
        .from("notes")
        .select(
          `
          content,
          created_at,
          appointments!inner(
            client_id,
            start_time
          )
        `
        )
        .eq("appointments.client_id", patientId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching patient notes:", error);
        return {
          success: false,
          error: {
            message: "Failed to fetch patient notes",
            code: "DATABASE_ERROR",
          },
        };
      }

      if (!notes || notes.length === 0) {
        return {
          success: false,
          error: {
            message: "No notes found for this patient",
            code: "NO_NOTES_FOUND",
          },
        };
      }

      // Extract content and prepare for AI analysis
      const notesContent = notes.map((note) => note.content.trim()).filter((content) => content.length > 0);

      if (notesContent.length === 0) {
        return {
          success: false,
          error: {
            message: "No valid note content found for this patient",
            code: "NO_VALID_CONTENT",
          },
        };
      }

      return { success: true, notes: notesContent };
    } catch (error) {
      console.error("Error in getAllPatientNotes:", error);
      return {
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      };
    }
  }

  /**
   * Retrieves a specific note for a patient
   */
  private async getSingleNote(
    noteId: string,
    patientId: string
  ): Promise<{ success: true; notes: string[] } | { success: false; error: { message: string; code: string } }> {
    try {
      const { data: note, error } = await supabaseClient
        .from("notes")
        .select(
          `
          content,
          appointments!inner(
            client_id
          )
        `
        )
        .eq("id", noteId)
        .eq("appointments.client_id", patientId)
        .single();

      if (error || !note) {
        return {
          success: false,
          error: {
            message: "Note not found or does not belong to specified patient",
            code: "NOTE_NOT_FOUND",
          },
        };
      }

      const content = note.content.trim();
      if (content.length === 0) {
        return {
          success: false,
          error: {
            message: "Note content is empty",
            code: "EMPTY_NOTE_CONTENT",
          },
        };
      }

      return { success: true, notes: [content] };
    } catch (error) {
      console.error("Error in getSingleNote:", error);
      return {
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      };
    }
  }

  /**
   * Prepares AI recommendations command by fetching appropriate notes
   */
  async prepareAIRecommendationsCommand(
    type: "all_notes" | "single_note",
    patientId: string,
    staffId: string,
    noteId?: string
  ): Promise<
    | { success: true; command: GenerateAIRecommendationsCommand }
    | { success: false; error: { message: string; code: string } }
  > {
    try {
      // Validate patient exists
      const patientValidation = await this.validatePatientExists(patientId);
      if (!patientValidation.success) {
        return { success: false, error: patientValidation.error };
      }

      let notesResult:
        | { success: true; notes: string[] }
        | { success: false; error: { message: string; code: string } };

      if (type === "all_notes") {
        notesResult = await this.getAllPatientNotes(patientId);
      } else {
        if (!noteId) {
          return {
            success: false,
            error: {
              message: "Note ID is required for single note analysis",
              code: "MISSING_NOTE_ID",
            },
          };
        }
        notesResult = await this.getSingleNote(noteId, patientId);
      }

      if (!notesResult.success) {
        return { success: false, error: notesResult.error };
      }

      // Create the command object
      const command: GenerateAIRecommendationsCommand = {
        patient_id: patientId,
        notes_content: notesResult.notes,
        request_type: type,
        staff_id: staffId,
      };

      return { success: true, command };
    } catch (error) {
      console.error("Error in prepareAIRecommendationsCommand:", error);
      return {
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      };
    }
  }
}

export const patientNotesAIService = new PatientNotesAIService();
