# API Endpoint Implementation Plan: GET /notes

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania wszystkich notatek pacjenta ze wszystkich jego wizyt. Dostęp ograniczony wyłącznie do personelu (staff). Obsługuje paginację, sortowanie i filtrowanie wyników.

**Cel biznesowy**: Umożliwienie personelowi medycznemu przeglądu kompletnej historii notatek pacjenta w celu lepszego zrozumienia jego przypadku i kontynuacji leczenia.

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/notes`
- **Parametry**:
  - **Wymagane**:
    - `patient_id` (string, UUID) - ID pacjenta do pobrania notatek
  - **Opcjonalne**:
    - `page` (number) - numer strony (domyślnie: 1, minimum: 1)
    - `limit` (number) - liczba elementów na stronę (domyślnie: 20, zakres: 1-100)
    - `sort` (string) - pole sortowania (domyślnie: "created_at")
    - `order` (string) - kierunek sortowania "asc"|"desc" (domyślnie: "desc")
- **Request Body**: Brak
- **Headers**: Authorization wymagany dla autentykacji

## 3. Wykorzystywane typy

### DTOs:

- `PatientNotesRequestDto` - walidacja parametrów zapytania
- `PatientNotesResponseDto` - struktura odpowiedzi
- `PatientNoteDto` - reprezentacja pojedynczej notatki
- `PaginationDto` - informacje o paginacji

### Command Models:

Endpoint korzysta głównie z istniejących typów, nie wymaga nowych command models.

### Zod Schemas:

```typescript
const PatientNotesQuerySchema = z.object({
  patient_id: z.string().uuid("Invalid patient ID format"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["created_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "notes": [
    {
      "id": "uuid",
      "appointment_id": "uuid",
      "appointment_date": "ISO8601",
      "author_id": "uuid",
      "author_name": "string",
      "author_role": "client|staff",
      "content": "string",
      "created_at": "ISO8601"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Błędy:

- **400 Bad Request**: Nieprawidłowe parametry
- **401 Unauthorized**: Brak autentykacji
- **403 Forbidden**: Użytkownik nie jest staff
- **500 Internal Server Error**: Błąd serwera

## 5. Przepływ danych

1. **Walidacja autentykacji**: Sprawdzenie tokenu z `context.locals.supabase`
2. **Autoryzacja**: Weryfikacja roli staff w profilu użytkownika
3. **Walidacja parametrów**: Użycie Zod schema do walidacji query parameters
4. **Sprawdzenie istnienia pacjenta**: Weryfikacja czy patient_id istnieje w bazie
5. **Query do bazy danych**:
   ```sql
   SELECT
     n.id,
     n.appointment_id,
     a.start_time as appointment_date,
     n.author_id,
     CONCAT(u.first_name, ' ', u.last_name) as author_name,
     n.author_role,
     n.content,
     n.created_at
   FROM notes n
   JOIN appointments a ON n.appointment_id = a.id
   JOIN users u ON n.author_id = u.id
   WHERE a.client_id = $1
   ORDER BY n.created_at DESC
   LIMIT $2 OFFSET $3
   ```
6. **Paginacja**: Obliczenie offset i total count
7. **Formatowanie odpowiedzi**: Mapowanie na DTOs

## 6. Względy bezpieczeństwa

### Autentykacja:

- Wymagany ważny JWT token w Authorization header
- Użycie `context.locals.supabase.auth.getUser()` dla weryfikacji

### Autoryzacja:

- Sprawdzenie roli użytkownika w tabeli users
- Tylko users z role = 'staff' mają dostęp
- Zwrócenie 403 dla non-staff users

### Walidacja danych:

- Wszystkie parametry walidowane przez Zod schemas
- UUID validation dla patient_id
- Range validation dla pagination parameters
- Enum validation dla sort/order fields

### Data Protection:

- Brak wrażliwych danych w response (hasła, itp.)
- Logging bez wrażliwych informacji
- Rate limiting (implementacja w middleware)

## 7. Obsługa błędów

### 400 Bad Request:

- Nieprawidłowy format UUID dla patient_id
- Wartości page/limit poza dozwolonym zakresem
- Nieprawidłowe wartości sort/order
- **Response**: `{ "error": { "message": "Invalid parameters", "details": {...} } }`

### 401 Unauthorized:

- Brak Authorization header
- Nieprawidłowy lub wygasły token
- **Response**: `{ "error": { "message": "Authentication required" } }`

### 403 Forbidden:

- Użytkownik nie ma roli staff
- **Response**: `{ "error": { "message": "Staff access required" } }`

### 404 Not Found:

- Patient_id nie istnieje w systemie
- **Response**: `{ "error": { "message": "Patient not found" } }`

### 500 Internal Server Error:

- Błędy bazy danych
- Nieoczekiwane błędy aplikacji
- **Response**: `{ "error": { "message": "Internal server error" } }`

## 8. Rozważania dotyczące wydajności

### Indeksy bazy danych:

- Index na `appointments(client_id)` dla szybkiego filtrowania
- Index na `notes(appointment_id)` dla joinów
- Index na `notes(created_at)` dla sortowania

## 9. Etapy wdrożenia

### 1. Utworzenie struktury plików

```
src/pages/api/notes.ts
src/lib/services/notes.service.ts
```

### 2. Implementacja NotesService

- Metoda `getPatientNotes()` z paginacją i sortowaniem
- Obsługa database queries z joinami
- Error handling dla database operations

### 3. Implementacja API endpoint

- Import i konfiguracja Zod schemas
- Authentication middleware setup
- Authorization check dla staff role
- Input validation i error handling

### 4. Implementacja walidacji i autoryzacji

```typescript
// Authentication check
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) return Response.json({...}, { status: 401 });

// Authorization check
const userProfile = await getUserProfile(user.id);
if (userProfile.role !== 'staff') return Response.json({...}, { status: 403 });
```

### 5. Database query implementation

- SQL query z odpowiednimi joinami
- Pagination logic z count query
- Proper error handling dla database operations

### 6. Response formatting

- Mapowanie database results na DTOs
- Pagination metadata calculation
- JSON response z proper HTTP status codes
