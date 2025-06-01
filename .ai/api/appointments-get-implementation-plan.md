# API Endpoint Implementation Plan: GET /appointments

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania listy wizyt z zaawansowanym filtrowaniem, sortowaniem i paginacją. Dostępny dla wszystkich zalogowanych użytkowników, z ograniczeniami uprawnień - zwykli użytkownicy (client) widzą tylko swoje wizyty, podczas gdy staff może filtrować po wszystkich klientach.

**Kluczowe funkcje:**
- Filtrowanie po klientach, pracownikach, statusie i zakresie dat
- Paginacja z konfigurowalnymi limitami (max 100)
- Sortowanie po czasie wizyty lub dacie utworzenia
- Join z danymi użytkowników dla client_name
- Row Level Security dla ograniczenia dostępu

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/appointments?[query_parameters]`
- **Parametry**:
  - **Wymagane**: Brak (wszystkie opcjonalne)
  - **Opcjonalne**: 
    - `client_id` (UUID): Filtr po kliencie (tylko staff)
    - `staff_id` (UUID): Filtr po pracowniku  
    - `status` (enum): booked|blocked|cancelled
    - `start_date` (string): Data od (YYYY-MM-DD)
    - `end_date` (string): Data do (YYYY-MM-DD)
    - `page` (number): Numer strony (default: 1)
    - `limit` (number): Elementów na stronę (default: 20, max: 100)
    - `sort` (enum): start_time|created_at (default: start_time)
    - `order` (enum): asc|desc (default: asc)
- **Request Body**: Brak
- **Headers**: 
  - `Authorization: Bearer {token}` (wymagany)

## 3. Wykorzystywane typy

```typescript
// DTOs
- AppointmentListRequestDto: Walidacja query parametrów
- AppointmentListResponseDto: Struktura odpowiedzi z paginacją
- AppointmentDto: Pojedyncza wizyta z joined data
- PaginationDto: Standardowa struktura paginacji
- ErrorDto: Standardowa struktura błędów
- ValidationErrorDto: Błędy walidacji z detalami

// Command Models  
- SearchAppointmentsCommand: Logika biznesowa wyszukiwania

// Database Types
- AppointmentStatus: Enum dla statusów wizyt
- Appointment: Typ tabeli appointments z bazy danych
- User: Typ tabeli users dla join operations
```

## 4. Szczegóły odpowiedzi

**Sukces (200 OK):**
```json
{
  "appointments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "client_id": "e29b4400-550e-41d4-a716-446655440001",
      "staff_id": "41d4e29b-4400-550e-a716-446655440002",
      "client_name": "Jan Kowalski",
      "start_time": "2024-01-15T10:00:00Z",
      "end_time": "2024-01-15T11:00:00Z",
      "status": "booked",
      "cancellation_reason": null,
      "created_at": "2024-01-10T08:30:00Z",
      "updated_at": "2024-01-10T08:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Błędy:**
- **400 Bad Request**: Nieprawidłowe parametry query, błędne formaty dat
- **401 Unauthorized**: Brak lub nieprawidłowy token autoryzacji
- **500 Internal Server Error**: Błąd bazy danych lub wewnętrzny

## 5. Przepływ danych

```
1. Request → Middleware autoryzacji
2. Walidacja query parametrów (Zod schema)
3. Sprawdzenie uprawnień użytkownika (client_id tylko dla staff)
4. AppointmentService.getAppointments(command)
5. Budowanie zapytania SQL z JOIN, WHERE, ORDER BY, LIMIT, OFFSET
6. Wykonanie count query dla total
7. Formatowanie wyników do AppointmentListResponseDto
8. Zwrócenie odpowiedzi JSON z paginacją
```

**Zapytanie SQL (aproximacja):**
```sql
-- Main query
SELECT 
  a.id, a.client_id, a.staff_id, a.start_time, a.end_time, 
  a.status, a.cancellation_reason, a.created_at, a.updated_at,
  CONCAT(u.first_name, ' ', u.last_name) as client_name
FROM appointments a
LEFT JOIN users u ON a.client_id = u.id
WHERE 
  ($1::uuid IS NULL OR a.client_id = $1)
  AND ($2::uuid IS NULL OR a.staff_id = $2)
  AND ($3::appointment_status IS NULL OR a.status = $3)
  AND ($4::date IS NULL OR a.start_time::date >= $4)
  AND ($5::date IS NULL OR a.start_time::date <= $5)
  -- RLS: Non-staff can only see their own appointments
  AND (current_user_role = 'staff' OR a.client_id = current_user_id)
ORDER BY a.start_time ASC
LIMIT $6 OFFSET $7;

-- Count query
SELECT COUNT(*) FROM appointments a WHERE [same conditions];
```

## 6. Względy bezpieczeństwa

**Autoryzacja:**
- Weryfikacja tokenu JWT z Supabase
- Sprawdzenie roli użytkownika dla client_id filtering
- Użycie context.locals.supabase dla session management

**Row Level Security:**
- Zwykli użytkownicy (client) widzą tylko swoje wizyty
- Staff może widzieć wszystkie wizyty
- Implementacja RLS na poziomie aplikacji lub bazy danych

**Walidacja danych:**
- Sanityzacja wszystkich query parametrów
- Walidacja formatów dat (YYYY-MM-DD)
- Walidacja UUID format dla client_id/staff_id
- Walidacja enum values (status, sort, order)

**Ochrona przed atakami:**
- Parametryzowane zapytania SQL (ochrona przed SQL injection)
- Limit rate limiting (rozważyć implementację)
- Input validation dla wszystkich parametrów

## 7. Obsługa błędów

| Kod | Scenariusz | Odpowiedź |
|-----|------------|-----------|
| 400 | Nieprawidłowy format daty | `{"error": {"message": "Invalid date format. Use YYYY-MM-DD", "code": "INVALID_DATE_FORMAT"}}` |
| 400 | Nieprawidłowy status | `{"error": {"message": "Invalid status. Must be: booked, blocked, cancelled", "code": "INVALID_STATUS"}}` |
| 400 | Limit poza zakresem | `{"error": {"message": "Limit must be between 1 and 100", "code": "INVALID_LIMIT"}}` |
| 400 | Nieprawidłowy UUID | `{"error": {"message": "Invalid UUID format", "code": "INVALID_UUID"}}` |
| 401 | Brak tokenu | `{"error": {"message": "Authentication required", "code": "UNAUTHORIZED"}}` |
| 403 | client_id dla non-staff | `{"error": {"message": "Staff access required for client_id filter", "code": "FORBIDDEN"}}` |
| 500 | Błąd bazy danych | `{"error": {"message": "Internal server error", "code": "DATABASE_ERROR"}}` |

**Logowanie błędów:**
- Błędy 4xx: Info level z user ID i parametrami
- Błędy 5xx: Error level z full stack trace
- Metryki performance dla monitorowania

## 8. Rozważania dotyczące wydajności

**Optymalizacje bazy danych:**
- Wykorzystanie istniejących indeksów na start_time, end_time
- Indeks na (client_id, start_time) dla client filtering
- Indeks na (staff_id, start_time) dla staff filtering
- Optymalizacja JOIN z users table

**Paginacja:**
- Użycie LIMIT/OFFSET dla paginacji
- Separate count query dla total
- Rozważyć cursor-based pagination dla lepszej wydajności

**Caching:**
- Rozważyć cache na często używane filtry
- TTL 2-5 minut dla list appointments
- Cache invalidation przy CRUD operations

**Monitoring:**
- Metryki czasu odpowiedzi per filter combination
- Monitoring slow queries
- Tracking pagination patterns

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury plików
```bash
# Utworzenie service layer
src/lib/services/AppointmentService.ts

# Endpoint API  
src/pages/api/appointments/index.ts
```

### Krok 2: Implementacja walidacji (Zod schema)
```typescript
// Schema walidacji w AppointmentService
const appointmentListRequestSchema = z.object({
  client_id: z.string().uuid().optional(),
  staff_id: z.string().uuid().optional(),
  status: z.enum(['booked', 'blocked', 'cancelled']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort: z.enum(['start_time', 'created_at']).default('start_time'),
  order: z.enum(['asc', 'desc']).default('asc')
});
```

### Krok 3: Implementacja AppointmentService
- Budowanie dynamicznych zapytań SQL
- JOIN z tabelą users dla client_name
- Implementacja paginacji i count queries
- Row Level Security logic

### Krok 4: Implementacja API endpoint
- Route handler w src/pages/api/appointments/index.ts
- Integracja z middleware autoryzacji
- Obsługa wszystkich query parametrów
- Proper error handling i status codes
