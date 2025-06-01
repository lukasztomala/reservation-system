# API Endpoint Implementation Plan: GET /appointments/:appointment_id/notes

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania notatek powiązanych z konkretnym spotkaniem. Obsługuje opcjonalne filtrowanie po roli autora oraz paginację wyników. Endpoint implementuje odpowiednie mechanizmy kontroli dostępu - klienci mogą widzieć tylko notatki ze swoich spotkań, podczas gdy personel ma dostęp do wszystkich notatek.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/appointments/:appointment_id/notes`
- **Parametry:**
  - **Wymagane:**
    - `appointment_id` (UUID w URL) - identyfikator spotkania
  - **Opcjonalne:**
    - `author_role` (query string) - filtrowanie po roli autora (client|staff)
    - `page` (query string) - numer strony (default: 1)
    - `limit` (query string) - liczba elementów na stronę (default: 20, max: 100)
- **Request Body:** Brak
- **Headers:**
  - `Authorization: Bearer <token>` (wymagany)
  - `Content-Type: application/json`

## 3. Wykorzystywane typy

### DTOs:

- `NotesListRequestDto` - walidacja parametrów query
- `NotesListResponseDto` - struktura odpowiedzi
- `NoteDto` - reprezentacja pojedynczej notatki
- `PaginationDto` - metadane paginacji
- `ErrorDto` - struktura błędów

### Command Models:

Brak specjalnych command models - endpoint tylko odczytuje dane.

### Database Types:

- `Note` - typ tabeli notes
- `User` - typ tabeli users (dla author_name)
- `Appointment` - typ tabeli appointments (dla weryfikacji dostępu)

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "notes": [
    {
      "id": "uuid",
      "appointment_id": "uuid",
      "author_id": "uuid",
      "author_name": "string",
      "author_role": "client|staff",
      "content": "string",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "total_pages": "number"
  }
}
```

### Błędy:

- **400 Bad Request:** Nieprawidłowe parametry
- **401 Unauthorized:** Brak lub nieprawidłowy token autoryzacji
- **403 Forbidden:** Brak uprawnień do spotkania
- **404 Not Found:** Spotkanie nie istnieje
- **500 Internal Server Error:** Błąd serwera

## 5. Przepływ danych

1. **Walidacja parametrów wejściowych** (Zod schema)

   - Sprawdzenie formatu UUID dla appointment_id
   - Walidacja author_role (client|staff)
   - Walidacja parametrów paginacji

2. **Autoryzacja i kontrola dostępu**

   - Pobranie użytkownika z tokenu (context.locals.supabase)
   - Sprawdzenie czy użytkownik ma dostęp do spotkania:
     - Klient: client_id = user.id
     - Personel: staff_id = user.id LUB role = 'staff'

3. **Pobranie danych z bazy**

   - Query do tabeli notes z joinami:
     - notes JOIN appointments ON notes.appointment_id = appointments.id
     - notes JOIN users ON notes.author_id = users.id
   - Filtrowanie po appointment_id
   - Opcjonalne filtrowanie po author_role
   - Paginacja z LIMIT i OFFSET
   - Sortowanie po created_at DESC

4. **Formatowanie odpowiedzi**
   - Mapowanie wyników na NoteDto
   - Obliczenie metadanych paginacji
   - Zwrócenie NotesListResponseDto

## 6. Względy bezpieczeństwa

### Autoryzacja:

- **Weryfikacja tokenu:** Użycie context.locals.supabase.auth.getUser()
- **Kontrola dostępu do spotkania:**
  - Klienci: Dostęp tylko do własnych spotkań (client_id = user.id)
  - Personel: Dostęp do spotkań gdzie są przypisani (staff_id = user.id) lub wszystkich jeśli mają rolę 'staff'

### Walidacja danych:

- **UUID validation:** Sprawdzenie formatu appointment_id
- **Enum validation:** author_role musi być 'client' lub 'staff'
- **Range validation:** page >= 1, limit między 1 a 100
- **SQL Injection prevention:** Użycie parametryzowanych zapytań Supabase

### Rate limiting:

- Implementacja w middleware dla protection przed abuse

## 7. Obsługa błędów

### Walidacja (400 Bad Request):

```typescript
// Nieprawidłowy UUID
{ message: "Invalid appointment ID format", code: "INVALID_UUID" }

// Nieprawidłowy author_role
{ message: "Invalid author role. Must be 'client' or 'staff'", code: "INVALID_AUTHOR_ROLE" }

// Nieprawidłowa paginacja
{ message: "Page must be a positive number", code: "INVALID_PAGE" }
{ message: "Limit must be between 1 and 100", code: "INVALID_LIMIT" }
```

### Autoryzacja (401 Unauthorized):

```typescript
{ message: "Authentication required", code: "UNAUTHORIZED" }
{ message: "Invalid or expired token", code: "TOKEN_INVALID" }
```

### Autoryzacja (403 Forbidden):

```typescript
{ message: "Access denied. You don't have permission to view notes for this appointment", code: "ACCESS_DENIED" }
```

### Nie znaleziono (404 Not Found):

```typescript
{ message: "Appointment not found", code: "APPOINTMENT_NOT_FOUND" }
```

### Błąd serwera (500 Internal Server Error):

```typescript
{ message: "Internal server error", code: "INTERNAL_ERROR" }
```

## 8. Rozważania dotyczące wydajności

### Optymalizacje bazy danych:

- **Indeksy:** Upewnić się, że istnieją indeksy na:
  - notes(appointment_id) - główny filtr
  - notes(author_role) - opcjonalny filtr
  - notes(created_at) - sortowanie
- **JOIN optimization:** Użycie efektywnych joinów z users dla author_name

### Paginacja:

- **Limit maksymalny:** 100 elementów na stronę
- **Default limit:** 20 elementów
- **Offset optimization:** Dla dużych offsetów rozważyć cursor-based pagination

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie walidacji i typów

- Utworzenie Zod schema dla NotesListRequestDto
- Zdefiniowanie response types w types.ts (już istnieją)
- Utworzenie error types i standardów

### Krok 2: Implementacja NotesService

- Utworzenie pliku `src/lib/services/notes.service.ts`
- Implementacja metody `getAppointmentNotes()`
- Logika autoryzacji i kontroli dostępu
- Query do bazy danych z joinami

### Krok 3: Implementacja endpoint handler

- Utworzenie `src/pages/api/appointments/[appointment_id]/notes.ts`
- Implementacja GET handler
- Walidacja parametrów
- Wywołanie NotesService
- Formatowanie odpowiedzi

### Krok 4: Obsługa błędów i logowanie

- Implementacja comprehensive error handling
- Dodanie loggingu dla audit trail
- Standardizacja error responses

### Struktura plików:

```
src/
├── pages/api/appointments/[appointment_id]/
│   └── notes.ts                 # API endpoint handler
├── lib/services/
│   └── notes.service.ts         # Business logic service
├── lib/schemas/
│   └── notes.schemas.ts         # Zod validation schemas
└── types.ts                     # DTOs (już istnieją)
```

### Dependencies:

- Zod dla walidacji
- Supabase client dla bazy danych
- Middleware dla autoryzacji (już istnieje)
