import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

// ============================================================================
// Base Entity Types (derived from database)
// ============================================================================

export type User = Tables<"users">;
export type Appointment = Tables<"appointments">;
export type Note = Tables<"notes">;

export type UserInsert = TablesInsert<"users">;
export type AppointmentInsert = TablesInsert<"appointments">;
export type NoteInsert = TablesInsert<"notes">;

export type UserUpdate = TablesUpdate<"users">;
export type AppointmentUpdate = TablesUpdate<"appointments">;
export type NoteUpdate = TablesUpdate<"notes">;

// Database Enums
export type UserRole = Enums<"user_role">;
export type AppointmentStatus = Enums<"appointment_status">;
export type NoteAuthorRole = Enums<"note_author_role">;

// ============================================================================
// Common DTOs
// ============================================================================

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  total_pages?: number;
}

export interface SessionDto {
  access_token: string;
  refresh_token: string;
}

// ============================================================================
// Authentication DTOs
// ============================================================================

export interface RegisterRequestDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string; // YYYY-MM-DD format
  phone: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

// Public user representation (excludes sensitive fields)
export interface UserDto {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  phone: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponseDto {
  user: UserDto;
  session: SessionDto;
}

export interface LogoutResponseDto {
  message: string;
}

// ============================================================================
// User DTOs
// ============================================================================

export interface UserSearchRequestDto {
  q: string;
  limit?: number;
}

export interface UserSearchResponseDto {
  users: Pick<UserDto, "id" | "first_name" | "last_name" | "email" | "phone" | "birth_date">[];
  total: number;
}

export interface UserProfileDto extends UserDto {
  // Extended user profile with additional computed fields
  full_name: string;
}

// ============================================================================
// Appointment DTOs
// ============================================================================

export interface AppointmentListRequestDto {
  client_id?: string;
  staff_id?: string;
  status?: AppointmentStatus;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  page?: number;
  limit?: number;
  sort?: "start_time" | "created_at";
  order?: "asc" | "desc";
}

// Appointment with joined user information
export interface AppointmentDto {
  id: string;
  client_id: string;
  staff_id: string;
  client_name: string;
  staff_name?: string;
  start_time: string; // ISO8601
  end_time: string; // ISO8601
  status: AppointmentStatus;
  cancellation_reason: string | null;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface AppointmentListResponseDto {
  appointments: AppointmentDto[];
  pagination: PaginationDto;
}

export interface AvailableSlotsRequestDto {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  staff_id?: string;
  appointment_type?: "first_visit" | "follow_up";
}

export interface AvailableSlotDto {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  staff_id: string;
  staff_name: string;
  duration_hours: number;
  appointment_type: "first_visit" | "follow_up";
}

export interface AvailableSlotsResponseDto {
  available_slots: AvailableSlotDto[];
  working_hours: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

export interface CreateAppointmentRequestDto {
  client_id: string;
  staff_id: string;
  start_time: string; // ISO8601
  appointment_type: "first_visit" | "follow_up";
  client_note?: string;
}

export interface CreateAppointmentResponseDto {
  id: string;
  client_id: string;
  staff_id: string;
  start_time: string; // ISO8601
  end_time: string; // ISO8601
  status: AppointmentStatus;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface UpdateAppointmentRequestDto {
  status: "cancelled" | "blocked";
  cancellation_reason: string;
}

export interface UpdateAppointmentResponseDto {
  id: string;
  status: AppointmentStatus;
  cancellation_reason: string;
  updated_at: string; // ISO8601
}

export interface AppointmentDetailsDto extends AppointmentDto {
  // Full appointment details with additional computed fields
  duration_minutes: number;
}

// ============================================================================
// Notes DTOs
// ============================================================================

export interface NotesListRequestDto {
  author_role?: NoteAuthorRole;
  page?: number;
  limit?: number;
}

// Note with author information
export interface NoteDto {
  id: string;
  appointment_id: string;
  author_id: string;
  author_name: string;
  author_role: NoteAuthorRole;
  content: string;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface NotesListResponseDto {
  notes: NoteDto[];
  pagination: PaginationDto;
}

export interface CreateNoteRequestDto {
  content: string;
}

export interface CreateNoteResponseDto {
  id: string;
  appointment_id: string;
  author_id: string;
  author_role: NoteAuthorRole;
  content: string;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface UpdateNoteRequestDto {
  content: string;
}

export interface UpdateNoteResponseDto {
  id: string;
  content: string;
  updated_at: string; // ISO8601
}

// Patient notes across all appointments (staff only)
export interface PatientNotesRequestDto {
  patient_id: string;
  page?: number;
  limit?: number;
  sort?: "created_at";
  order?: "asc" | "desc";
}

export interface PatientNoteDto {
  id: string;
  appointment_id: string;
  appointment_date: string; // ISO8601
  author_id: string;
  author_name: string;
  author_role: NoteAuthorRole;
  content: string;
  created_at: string; // ISO8601
}

export interface PatientNotesResponseDto {
  notes: PatientNoteDto[];
  pagination: PaginationDto;
}

// ============================================================================
// AI DTOs
// ============================================================================

export interface AIRecommendationRequestDto {
  type: "all_notes" | "single_note";
  patient_id: string;
  note_id?: string | null;
}

export interface AIRecommendationDto {
  title: string;
  points: string[];
  reasoning: string;
  confidence: number;
  tcm_principle: string;
}

export interface AIRecommendationResponseDto {
  recommendations: AIRecommendationDto[];
  input_summary: string;
  generated_at: string; // ISO8601
}

// ============================================================================
// Error DTOs
// ============================================================================

export interface ErrorDto {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface ValidationErrorDto extends ErrorDto {
  field_errors?: Record<string, string[]>;
}

// ============================================================================
// Command Models (for internal application logic)
// ============================================================================

// Command for creating a user account
export interface CreateUserCommand {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  phone: string;
  role?: UserRole;
}

// Command for creating an appointment with business logic
export interface CreateAppointmentCommand {
  client_id: string;
  staff_id: string;
  start_time: string;
  appointment_type: "first_visit" | "follow_up";
  client_note?: string;
  // Calculated fields
  end_time?: string; // Will be calculated based on appointment_type
  status?: AppointmentStatus;
}

// Command for updating appointment status
export interface UpdateAppointmentCommand {
  id: string;
  status: AppointmentStatus;
  cancellation_reason?: string;
  updated_by: string; // User ID who made the change
}

// Command for creating a note
export interface CreateNoteCommand {
  appointment_id: string;
  author_id: string;
  content: string;
  // Calculated fields
  author_role?: NoteAuthorRole; // Will be determined from author's role
}

// Command for searching users with fuzzy matching
export interface SearchUsersCommand {
  query: string;
  limit?: number;
  role_filter?: UserRole;
}

// Command for generating available time slots
export interface GenerateAvailableSlotsCommand {
  start_date: string;
  end_date: string;
  staff_id?: string;
  appointment_type?: "first_visit" | "follow_up";
  working_hours?: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

// ============================================================================
// Utility Types
// ============================================================================

// Type for API responses with consistent structure
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ErrorDto;
  success: boolean;
}

// Type for paginated API responses
export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T> {
  pagination?: PaginationDto;
}

// Type helpers for working with database entities
export type CreateEntity<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];

export type UpdateEntity<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];

export type EntityRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
