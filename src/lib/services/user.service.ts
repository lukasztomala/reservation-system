import type { SupabaseClient } from "../../db/supabase.client";
import { CLIENT_USER_ID } from "../../db/supabase.client";
import type { UserDto } from "../../types";

export class UserService {
  /**
   * Pobiera dane aktualnego użytkownika (CLIENT) na podstawie CLIENT_USER_ID
   * @param supabase - klient Supabase z kontekstu
   * @returns UserDto z danymi użytkownika
   * @throws Error jeśli użytkownik nie zostanie znaleziony lub wystąpi błąd bazy danych
   */
  async getCurrentUser(supabase: SupabaseClient): Promise<UserDto> {
    try {
      // Zapytanie do bazy danych używając CLIENT_USER_ID
      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, first_name, last_name, birth_date, phone, role, created_at")
        .eq("id", CLIENT_USER_ID)
        .single();

      if (error) {
        // Rozróżnienie błędów: PGRST116 = brak użytkownika, inne = błędy bazy danych
        if (error.code === "PGRST116") {
          console.warn(`CLIENT user with ID ${CLIENT_USER_ID} not found in database`);
          throw new Error("User not found");
        }

        console.error("Database error in getCurrentUser:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!user) {
        throw new Error("User not found");
      }

      // Mapowanie User -> UserDto
      const userDto: UserDto = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        birth_date: user.birth_date,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      };

      return userDto;
    } catch (error) {
      // Rozróżnienie typów błędów dla proper error handling
      if (error instanceof Error) {
        if (error.message === "User not found") {
          throw error; // Re-throw user not found jako 404
        }
      }

      // Inne błędy jako server error
      console.error("Unexpected error in getCurrentUser:", error);
      throw new Error("Internal server error");
    }
  }
}

// Export singleton instance
export const userService = new UserService();
