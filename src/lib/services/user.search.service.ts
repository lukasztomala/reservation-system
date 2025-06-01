import { z } from "zod";
import type { SupabaseClient } from "../../db/supabase.client";
import type { UserSearchRequestDto, UserSearchResponseDto, SearchUsersCommand } from "../../types";

// Typ dla wyniku wyszukiwania użytkowników
interface SearchUserResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string;
  similarity_score?: number;
}

/**
 * Schema walidacji dla parametrów wyszukiwania użytkowników
 */
const searchRequestSchema = z.object({
  q: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Search query is too long")
    .transform((str) => str.trim()),
  limit: z.number().min(1, "Limit must be at least 1").max(50, "Limit cannot exceed 50").default(10),
});

export class UserSearchService {
  /**
   * Wyszukuje pacjentów (użytkowników z rolą 'client') po imieniu i nazwisku
   * z wykorzystaniem fuzzy matching PostgreSQL pg_trgm
   *
   * @param supabase - klient Supabase z kontekstu
   * @param request - parametry wyszukiwania
   * @returns UserSearchResponseDto z wynikami wyszukiwania
   * @throws Error przy błędach walidacji lub bazy danych
   */
  async searchUsers(supabase: SupabaseClient, request: UserSearchRequestDto): Promise<UserSearchResponseDto> {
    try {
      // Walidacja parametrów wejściowych
      const validatedRequest = searchRequestSchema.parse(request);

      // Przygotowanie command do logiki biznesowej
      const command: SearchUsersCommand = {
        query: validatedRequest.q,
        limit: validatedRequest.limit,
        role_filter: "client",
      };

      // Wykonanie wyszukiwania fuzzy search
      const searchResults = await this.performFuzzySearch(supabase, command);

      return searchResults;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Błąd walidacji - przekształć na przyjazny komunikat
        const firstError = error.errors[0];
        throw new Error(`Validation error: ${firstError.message}`);
      }

      // Re-throw innych błędów
      throw error;
    }
  }

  /**
   * Wykonuje fuzzy search w bazie danych używając PostgreSQL pg_trgm
   *
   * @param supabase - klient Supabase
   * @param command - parametry wyszukiwania
   * @returns UserSearchResponseDto z wynikami
   * @throws Error przy błędach bazy danych
   */
  private async performFuzzySearch(
    supabase: SupabaseClient,
    command: SearchUsersCommand
  ): Promise<UserSearchResponseDto> {
    try {
      // Sanityzacja query string - usuwanie potencjalnie niebezpiecznych znaków
      const sanitizedQuery = this.sanitizeSearchQuery(command.query);

      // Próba użycia custom RPC function dla pg_trgm similarity search
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rpcUsers, error: rpcError } = await (supabase as any).rpc("search_users_by_name", {
          search_query: sanitizedQuery,
          search_limit: command.limit || 10,
          role_filter: command.role_filter || "client",
          min_similarity: 0.1, // próg podobieństwa
        });

        if (!rpcError && Array.isArray(rpcUsers) && rpcUsers.length > 0) {
          // Walidacja i mapowanie wyników z RPC
          const validatedUsers = rpcUsers
            .filter((user: unknown): user is SearchUserResult => {
              return (
                typeof user === "object" &&
                user !== null &&
                "id" in user &&
                "first_name" in user &&
                "last_name" in user &&
                "email" in user &&
                "phone" in user &&
                "birth_date" in user
              );
            })
            .map((user) => ({
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              phone: user.phone,
              birth_date: user.birth_date,
            }));

          return {
            users: validatedUsers,
            total: validatedUsers.length,
          };
        }

        // Jeśli RPC nie istnieje lub zwraca błąd, fallback do prostszego zapytania
        console.warn("RPC function search_users_by_name not available, falling back to similarity search");
      } catch (rpcError) {
        console.warn("RPC function failed, falling back to similarity search:", rpcError);
      }

      // Fallback: Używamy similarity operator % z pg_trgm jeśli dostępny
      try {
        const { data: similarityUsers, error: similarityError } = await supabase
          .from("users")
          .select("id, first_name, last_name, email, phone, birth_date")
          .eq("role", command.role_filter || "client")
          .textSearch("full_name", sanitizedQuery, {
            type: "websearch",
            config: "english",
          })
          .limit(command.limit || 10);

        if (!similarityError && similarityUsers && similarityUsers.length > 0) {
          // Sukces z text search
          return {
            users: similarityUsers.map((user) => ({
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              phone: user.phone,
              birth_date: user.birth_date,
            })),
            total: similarityUsers.length,
          };
        }
      } catch (textSearchError) {
        console.warn("Text search failed, falling back to ILIKE:", textSearchError);
      }

      // Ostateczny fallback: ILIKE search (istniejąca implementacja)
      console.warn("Advanced search methods not available, using ILIKE fallback");
      const { data: users, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, phone, birth_date")
        .eq("role", command.role_filter || "client")
        .or(`first_name.ilike.%${sanitizedQuery}%,last_name.ilike.%${sanitizedQuery}%`)
        .limit(command.limit || 10)
        .order("first_name", { ascending: true });

      if (error) {
        console.error("Database error in fuzzy search:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Mapowanie wyników na DTO
      const mappedUsers = users.map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        birth_date: user.birth_date,
      }));

      return {
        users: mappedUsers,
        total: mappedUsers.length,
      };
    } catch (error) {
      console.error("Error in performFuzzySearch:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Internal server error during search");
    }
  }

  /**
   * Sanityzuje query string usuwając potencjalnie niebezpieczne znaki
   *
   * @param query - zapytanie wyszukiwania
   * @returns oczyszczony string
   */
  private sanitizeSearchQuery(query: string): string {
    // Usuwanie znaków specjalnych, zachowanie liter, cyfr, spacji i polskich znaków
    return query
      .replace(/[^\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]/g, "")
      .trim()
      .toLowerCase();
  }
}

// Export singleton instance
export const userSearchService = new UserSearchService(); 