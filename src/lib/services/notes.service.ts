import type { CreateNoteCommand, CreateNoteResponseDto, NoteInsert, Note, NoteAuthorRole, UserRole } from "../../types";
import { supabaseClient } from "../../db/supabase.client";

/**
 * Service responsible for managing notes for appointments
 * Contains business logic for CRUD operations on notes
 */
export class NotesService {
  /**
   * Checks if user has permission to access/modify appointment
   */
  private async validateAppointmentAccess(
    appointmentId: string,
    userId: string,
    userRole: UserRole
  ): Promise<
    | { success: true; appointment: { client_id: string; staff_id: string; status: string } }
    | { success: false; error: { message: string; code: string } }
  > {
    try {
      console.log(`[DEBUG] Validating access for appointment: ${appointmentId}, user: ${userId}, role: ${userRole}`);

      // Get appointment details
      const { data: appointment, error } = await supabaseClient
        .from("appointments")
        .select("client_id, staff_id, status")
        .eq("id", appointmentId)
        .single();

      console.log(`[DEBUG] Supabase query result:`, { data: appointment, error: error });

      if (error || !appointment) {
        console.log(`[DEBUG] Appointment not found or error:`, {
          error: error,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details,
        });
        return {
          success: false,
          error: {
            message: "Appointment not found",
            code: "NOT_FOUND",
          },
        };
      }

      console.log(`[DEBUG] Found appointment:`, appointment);

      // Check permissions based on user role
      if (userRole === "client" && appointment.client_id !== userId) {
        console.log(
          `[DEBUG] Client access denied: appointment.client_id=${appointment.client_id} !== userId=${userId}`
        );
        return {
          success: false,
          error: {
            message: "Access denied. You can only add notes to your own appointments",
            code: "ACCESS_DENIED",
          },
        };
      }

      if (userRole === "staff" && appointment.staff_id !== userId) {
        console.log(`[DEBUG] Staff access denied: appointment.staff_id=${appointment.staff_id} !== userId=${userId}`);
        return {
          success: false,
          error: {
            message: "Access denied. You can only add notes to appointments where you are assigned as staff",
            code: "ACCESS_DENIED",
          },
        };
      }

      console.log(`[DEBUG] Access granted for ${userRole}`);
      return { success: true, appointment };
    } catch (error) {
      console.error("[DEBUG] Exception in validateAppointmentAccess:", error);
      return {
        success: false,
        error: {
          message: "Failed to validate appointment access",
          code: "DATABASE_ERROR",
        },
      };
    }
  }

  /**
   * Determines author role based on user role and appointment relationship
   */
  private determineAuthorRole(userRole: UserRole): NoteAuthorRole {
    return userRole === "client" ? "client" : "staff";
  }

  /**
   * Creates a new note for an appointment
   */
  async createNote(
    command: CreateNoteCommand,
    userId: string,
    userRole: UserRole
  ): Promise<
    { success: true; data: CreateNoteResponseDto } | { success: false; error: { message: string; code: string } }
  > {
    try {
      // Validate appointment access
      const accessValidation = await this.validateAppointmentAccess(command.appointment_id, userId, userRole);
      if (!accessValidation.success) {
        return { success: false, error: accessValidation.error };
      }

      // Determine author role
      const authorRole = this.determineAuthorRole(userRole);

      // Prepare note data
      const noteData: NoteInsert = {
        appointment_id: command.appointment_id,
        author_id: userId,
        author_role: authorRole,
        content: command.content.trim(),
      };

      // Insert note into database
      const { data: note, error } = await supabaseClient.from("notes").insert(noteData).select("*").single();

      if (error || !note) {
        console.error("Error creating note:", error);
        return {
          success: false,
          error: {
            message: "Failed to create note",
            code: "DATABASE_ERROR",
          },
        };
      }

      // Return response matching CreateNoteResponseDto
      const response: CreateNoteResponseDto = {
        id: note.id,
        appointment_id: note.appointment_id,
        author_id: note.author_id,
        author_role: note.author_role,
        content: note.content,
        created_at: note.created_at,
        updated_at: note.updated_at,
      };

      return { success: true, data: response };
    } catch (error) {
      console.error("Error in createNote:", error);
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
   * Gets all notes for a specific appointment
   */
  async getAppointmentNotes(
    appointmentId: string,
    userId: string,
    userRole: UserRole
  ): Promise<{ success: true; data: Note[] } | { success: false; error: { message: string; code: string } }> {
    try {
      // Validate appointment access
      const accessValidation = await this.validateAppointmentAccess(appointmentId, userId, userRole);
      if (!accessValidation.success) {
        return { success: false, error: accessValidation.error };
      }

      // Get notes for appointment
      const { data: notes, error } = await supabaseClient
        .from("notes")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching appointment notes:", error);
        return {
          success: false,
          error: {
            message: "Failed to fetch notes",
            code: "DATABASE_ERROR",
          },
        };
      }

      return { success: true, data: notes || [] };
    } catch (error) {
      console.error("Error in getAppointmentNotes:", error);
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
