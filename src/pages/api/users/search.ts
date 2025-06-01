import type { APIContext } from "astro";
import { userSearchService } from "../../../lib/services/user.search.service";
import type { UserSearchRequestDto, UserSearchResponseDto, ApiResponse } from "../../../types";

export const prerender = false;

/**
 * GET /api/users/search - Wyszukuje pacjentów (użytkowników z rolą 'client') po imieniu i nazwisku
 *
 * Autoryzacja: Tylko użytkownicy z rolą 'staff'
 * Query parametry:
 * - q (string, wymagany): Zapytanie wyszukiwania (imię/nazwisko)
 * - limit (number, opcjonalny): Liczba wyników (1-50, domyślnie 10)
 *
 * @param context - Kontekst API Astro zawierający locals.supabase i URL
 * @returns Response z wynikami wyszukiwania lub błędem
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // Early return - sprawdzenie dostępności klienta Supabase
    const supabase = context.locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in context.locals");
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: {
          message: "Internal server error",
          code: "SERVER_ERROR",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO: Implementacja autoryzacji - sprawdzenie czy użytkownik ma rolę 'staff'
    // Tymczasowo pomijamy autoryzację zgodnie z planem implementacji po etapach

    // Pobranie i walidacja parametrów query
    const url = new URL(context.request.url);
    const queryParam = url.searchParams.get("q");
    const limitParam = url.searchParams.get("limit");

    // Early return - sprawdzenie wymaganego parametru 'q'
    if (!queryParam || queryParam.trim() === "") {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: {
          message: "Search query is required",
          code: "MISSING_QUERY",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parsowanie i walidacja parametru limit
    let limit = 10; // domyślna wartość
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: {
            message: "Limit must be between 1 and 50",
            code: "INVALID_LIMIT",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      limit = parsedLimit;
    }

    // Przygotowanie request DTO
    const searchRequest: UserSearchRequestDto = {
      q: queryParam.trim(),
      limit: limit,
    };

    try {
      // Wywołanie UserSearchService do wyszukiwania użytkowników
      const searchResults: UserSearchResponseDto = await userSearchService.searchUsers(supabase, searchRequest);

      // Sukces - zwrócenie wyników wyszukiwania
      const successResponse: ApiResponse<UserSearchResponseDto> = {
        success: true,
        data: searchResults,
      };

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (serviceError) {
      // Obsługa błędów z UserSearchService
      if (serviceError instanceof Error) {
        // Błąd walidacji - 400
        if (serviceError.message.startsWith("Validation error:")) {
          console.warn("Validation error in search:", serviceError.message);
          const errorResponse: ApiResponse<never> = {
            success: false,
            error: {
              message: serviceError.message,
              code: "VALIDATION_ERROR",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Database lub internal server error - 500
        console.error("Service error in GET /users/search:", serviceError);
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: {
            message: "Internal server error",
            code: "DATABASE_ERROR",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  } catch (error) {
    // Catch-all dla nieoczekiwanych błędów
    console.error("Unexpected error in GET /users/search:", error);
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fallback return (nie powinno się nigdy zdarzyć)
  const fallbackError: ApiResponse<never> = {
    success: false,
    error: {
      message: "Internal server error",
      code: "SERVER_ERROR",
    },
  };
  return new Response(JSON.stringify(fallbackError), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
