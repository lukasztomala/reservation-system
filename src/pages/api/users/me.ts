import type { APIContext } from "astro";
import { userService } from "../../../lib/services/user.service";
import type { UserDto, ApiResponse } from "../../../types";

export const prerender = false;

/**
 * GET /api/users/me - Pobiera profil użytkownika STAFF (bez autoryzacji)
 *
 * @param context - Kontekst API Astro zawierający locals.supabase
 * @returns Response z danymi użytkownika lub błędem
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

    // Wywołanie UserService do pobrania danych użytkownika (STAFF)
    try {
      const userData: UserDto = await userService.getCurrentUser(supabase);

      // Sukces - zwrócenie danych użytkownika
      const successResponse: ApiResponse<UserDto> = {
        success: true,
        data: userData,
      };

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (serviceError) {
      // Obsługa błędów z UserService
      if (serviceError instanceof Error) {
        // User not found - 404
        if (serviceError.message === "User not found") {
          console.warn("STAFF user not found in database");
          const errorResponse: ApiResponse<never> = {
            success: false,
            error: {
              message: "User not found",
              code: "USER_NOT_FOUND",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Database or internal server error - 500
        console.error("Service error in GET /users/me:", serviceError);
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
    console.error("Unexpected error in GET /users/me:", error);
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
