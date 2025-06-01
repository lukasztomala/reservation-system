# API Endpoint Implementation Plan: POST /auth/logout

## 1. Przegląd punktu końcowego

Endpoint POST /auth/logout służy do kończenia sesji użytkownika w systemie rezerwacji. Jest to prosta operacja bezpieczeństwa, która invaliduje aktualną sesję użytkownika i czyści związane z nią tokeny autoryzacyjne. Endpoint nie przyjmuje żadnych parametrów i zwraca potwierdzenie pomyślnego wylogowania.

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/auth/logout`
- **Parametry**:
  - **Wymagane**: Brak parametrów zapytania ani treści żądania
  - **Opcjonalne**: Brak
- **Request Body**: Pusty
- **Nagłówki**:
  - `Authorization: Bearer <access_token>` (lub session cookie)
  - `Content-Type: application/json`

## 3. Wykorzystywane typy

### DTOs:

- `LogoutResponseDto` - dla struktury odpowiedzi:
  ```typescript
  interface LogoutResponseDto {
    message: string;
  }
  ```

### Error DTOs:

- `ErrorDto` - dla obsługi błędów

### Brak potrzeby Command Models - operacja jest zbyt prosta.

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "message": "Successfully logged out"
}
```

### Błędy:

- **401 Unauthorized**: Brak ważnej sesji użytkownika

  ```json
  {
    "message": "Unauthorized - invalid or expired session",
    "code": "INVALID_SESSION"
  }
  ```

- **500 Internal Server Error**: Błąd po stronie serwera
  ```json
  {
    "message": "Internal server error",
    "code": "SERVER_ERROR"
  }
  ```

## 5. Przepływ danych

1. **Odbiór żądania**: Endpoint otrzymuje żądanie POST bez treści
2. **Walidacja sesji**: Sprawdzenie obecności i ważności tokenu sesji z `context.locals.supabase`
3. **Wywołanie service**: Przekazanie żądania do `AuthService.logout()`
4. **Invalidacja sesji**: Usunięcie sesji z Supabase auth
5. **Czyszczenie cookies**: Usunięcie cookies sesji z przeglądarki
6. **Zwrócenie odpowiedzi**: Potwierdzenie pomyślnego wylogowania

## 6. Względy bezpieczeństwa

### Uwierzytelnianie:

- Sprawdzenie obecności ważnej sesji użytkownika przed wykonaniem operacji
- Użycie Supabase auth do zarządzania sesjami

### Autoryzacja:

- Każdy zalogowany użytkownik może wylogować swoją sesję
- Brak dodatkowych ograniczeń ról

### Walidacja:

- Sprawdzenie ważności tokenu sesji
- Walidacja pochodzenia żądania (CSRF protection)

### Bezpieczeństwo sesji:

- Invalidacja wszystkich tokenów użytkownika
- Czyszczenie cookies zawierających dane sesji
- Logowanie operacji wylogowania dla audytu

## 7. Obsługa błędów

### Scenariusze błędów:

1. **Brak sesji (401)**:

   - Sytuacja: Użytkownik nie jest zalogowany lub sesja wygasła
   - Obsługa: Zwrócenie 401 z odpowiednim komunikatem
   - Logowanie: INFO level - normalna sytuacja

2. **Błąd Supabase (500)**:

   - Sytuacja: Problemy z komunikacją z Supabase
   - Obsługa: Zwrócenie 500 z ogólnym komunikatem błędu
   - Logowanie: ERROR level - szczegóły błędu dla debugowania

3. **Błąd walidacji (400)**:
   - Sytuacja: Nieprawidłowe dane żądania (edge cases)
   - Obsługa: Zwrócenie 400 z informacją o błędzie
   - Logowanie: WARN level

### Strategia error handling:

- Early returns dla wszystkich warunków błędów
- Szczegółowe logowanie dla celów debugowania
- Ogólne komunikaty błędów dla użytkowników końcowych
- Graceful handling błędów Supabase

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

- Opóźnienia sieci przy komunikacji z Supabase
- Czas invalidacji sesji w Supabase

### Strategie optymalizacji:

- Asynchroniczne invalidation tokenów
- Timeout dla żądań do Supabase (5-10 sekund)
- Caching konfiguracji auth (working hours, rate limits)
- Connection pooling dla Supabase (zarządzane przez klienta)

### Monitoring:

- Metryki czasu odpowiedzi
- Rate sucessful/failed logout attempts
- Monitoring błędów Supabase connectivity

## 9. Etapy wdrożenia

### Krok 1: Utworzenie AuthService

- Utworzenie pliku `src/lib/services/auth.service.ts`
- Implementacja metody `logout()` z obsługą Supabase auth
- Dodanie error handling i logowania

### Krok 2: Implementacja endpointu API

- Utworzenie pliku `src/pages/api/auth/logout.ts`
- Implementacja handlera POST z `export const prerender = false`
- Integracja z AuthService i Supabase z `context.locals`

### Krok 3: Walidacja i bezpieczeństwo

- Implementacja walidacji sesji użytkownika
- Dodanie mechanizmów bezpieczeństwa (CSRF protection)
- Implementacja rate limiting (jeśli wymagane)

### Krok 4: Error handling

- Implementacja kompleksowej obsługi błędów
- Dodanie szczegółowego logowania
- Walidacja wszystkich edge cases

### Przykład implementacji AuthService:

```typescript
// src/lib/services/auth.service.ts
export class AuthService {
  async logout(supabase: SupabaseClient): Promise<LogoutResponseDto> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }

    return { message: "Successfully logged out" };
  }
}
```

### Przykład implementacji endpointu:

```typescript
// src/pages/api/auth/logout.ts
export const prerender = false;

export async function POST(context: APIContext): Promise<Response> {
  // Early error handling
  // Service logic
  // Response formatting
}
```
