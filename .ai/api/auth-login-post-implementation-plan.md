# API Endpoint Implementation Plan: POST /auth/login

## 1. Przegląd punktu końcowego

Endpoint `POST /auth/login` służy do uwierzytelniania istniejących użytkowników w systemie rezerwacji. Umożliwia użytkownikom logowanie się przy użyciu adresu email i hasła, zwracając w odpowiedzi dane użytkownika oraz tokeny sesji niezbędne do autoryzacji kolejnych żądań API.

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/auth/login`
- **Content-Type**: `application/json`
- **Parametry**:
  - Wymagane: `email` (string), `password` (string)
  - Opcjonalne: brak
- **Request Body**:

```json
{
  "email": "user@example.com",
  "password": "userPassword123"
}
```

## 3. Wykorzystywane typy

### DTOs (już istnieją w `src/types.ts`):

- `LoginRequestDto` - struktura danych wejściowych
- `AuthResponseDto` - struktura odpowiedzi sukcesu
- `UserDto` - reprezentacja użytkownika bez wrażliwych danych
- `SessionDto` - tokeny sesji (access_token, refresh_token)
- `ErrorDto` - struktura odpowiedzi błędu

### Schema walidacji (nowy):

```typescript
// src/lib/schemas/auth.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "birth_date": "string",
    "phone": "string",
    "role": "client|staff",
    "created_at": "string"
  },
  "session": {
    "access_token": "string",
    "refresh_token": "string"
  }
}
```

### Błędy:

- **400 Bad Request**: Nieprawidłowe dane wejściowe

```json
{
  "message": "Validation failed",
  "field_errors": {
    "email": ["Invalid email format"],
    "password": ["Password is required"]
  }
}
```

- **401 Unauthorized**: Nieprawidłowe poświadczenia

```json
{
  "message": "Invalid credentials"
}
```

- **500 Internal Server Error**: Błąd serwera

```json
{
  "message": "Internal server error"
}
```

## 5. Przepływ danych

1. **Walidacja danych wejściowych**:

   - Sprawdzenie formatu JSON
   - Walidacja schema przy użyciu Zod
   - Zwrócenie błędu 400 w przypadku nieprawidłowych danych

2. **Uwierzytelnienie**:

   - Przekazanie danych do AuthService
   - Użycie Supabase Auth API do weryfikacji poświadczeń
   - Pobranie danych użytkownika z tabeli `users`

3. **Przygotowanie odpowiedzi**:

   - Konwersja danych użytkownika do UserDto
   - Zwrócenie UserDto wraz z tokenami sesji
   - Ustawienie cookies z tokenami (opcjonalnie)

4. **Obsługa błędów**:
   - Logowanie nieudanych prób logowania
   - Zwrócenie odpowiednich kodów błędów

## 6. Względy bezpieczeństwa

### Uwierzytelnienie i autoryzacja:

- Wykorzystanie Supabase Auth dla bezpiecznego zarządzania hasłami
- Tokeny JWT dla autoryzacji sesji
- Automatic token refresh przez Supabase SDK

### Ochrona przed atakami:

- **Rate limiting**: Ograniczenie liczby prób logowania (implementacja w middleware)
- **Brute force protection**: Monitorowanie i blokowanie podejrzanych IP
- **Input sanitization**: Walidacja i sanityzacja danych wejściowych

### Bezpieczeństwo danych:

- Nie ujawnianie czy email istnieje w systemie
- Nie logowanie haseł ani tokenów
- Używanie HTTPS dla wszystkich komunikacji
- Bezpieczne przechowywanie tokenów w cookies (httpOnly, secure)

## 7. Obsługa błędów

### Walidacja danych wejściowych (400):

- Brakujące pola wymagane
- Nieprawidłowy format email
- Puste hasło

### Uwierzytelnienie (401):

- Nieprawidłowy email lub hasło
- Zablokowane konto użytkownika
- Nieaktywne konto

### Błędy serwera (500):

- Problemy z połączeniem do Supabase
- Błędy bazy danych
- Błędy sieci lub timeouty

### Strategia logowania:

```typescript
// Przykład logowania błędów
console.error("[AUTH_LOGIN_ERROR]", {
  timestamp: new Date().toISOString(),
  email: email, // Nie logujemy hasła
  error: error.message,
  ip: request.headers.get("x-forwarded-for"),
});
```

## 8. Rozważania dotyczące wydajności

### Optymalizacje:

- **Caching**: Cache danych użytkownika dla częstych żądań
- **Connection pooling**: Wykorzystanie connection poolingu Supabase
- **Response compression**: Kompresja odpowiedzi JSON

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktur danych

- Utworzenie schema walidacji w `src/lib/schemas/auth.schema.ts`
- Weryfikacja typów w `src/types.ts`

### Krok 2: Implementacja AuthService

- Utworzenie `src/lib/services/auth.service.ts`
- Implementacja metody `login(email, password)`
- Integracja z Supabase Auth API

### Krok 3: Utworzenie endpointu API

- Utworzenie `src/pages/api/auth/login.ts`
- Implementacja handler-a POST
- Dodanie `export const prerender = false`

## 10. Pliki do utworzenia/modyfikacji

### Nowe pliki:

- `src/lib/schemas/auth.schema.ts` - schema walidacji
- `src/lib/services/auth.service.ts` - logika uwierzytelniania
- `src/pages/api/auth/login.ts` - endpoint API

### Modyfikacje istniejących plików:

- `src/middleware/index.ts` - rate limiting (opcjonalnie)
- `src/types.ts` - weryfikacja typów (jeśli potrzebne)

### Struktura plików:

```
src/
├── lib/
│   ├── schemas/
│   │   └── auth.schema.ts
│   └── services/
│       └── auth.service.ts
├── pages/
│   └── api/
│       └── auth/
│           └── login.ts
└── middleware/
    └── index.ts
```
