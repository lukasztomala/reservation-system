# API Endpoint Implementation Plan: POST /appointments

## 1. Przegląd punktu końcowego

Endpoint służy do tworzenia nowych wizyt w systemie rezerwacji. Obsługuje złożoną logikę biznesową obejmującą walidację dostępności terminów, automatyczne obliczanie czasu zakończenia na podstawie typu wizyty, oraz sprawdzanie uprawnień użytkowników. Kluczowym elementem jest wykrywanie konfliktów czasowych i zapewnienie integralności harmonogramu.

**Kluczowe funkcje:**
- Tworzenie nowych wizyt z automatycznym obliczaniem end_time
- Walidacja dostępności time slots (konflikt detection)
- Różne czasy trwania: first_visit (90 min) vs follow_up (60 min)
- Kontrola uprawnień - clients tylko dla siebie, staff dla wszystkich
- Integracja z exclusion constraint bazy danych

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/appointments`
- **Parametry**:
  - **Wymagane**: Brak (wszystkie dane w request body)
  - **Opcjonalne**: Brak
- **Request Body**:
```json
{
  "client_id": "uuid",         // Wymagane: ID klienta
  "staff_id": "uuid",          // Wymagane: ID pracownika
  "start_time": "ISO8601",     // Wymagane: Czas rozpoczęcia
  "appointment_type": "enum",  // Wymagane: first_visit|follow_up
  "client_note": "string"      // Opcjonalne: Notatka klienta
}
```
- **Headers**: 
  - `Authorization: Bearer {token}` (wymagany)
  - `Content-Type: application/json` (wymagany)

## 3. Wykorzystywane typy

```typescript
// DTOs
- CreateAppointmentRequestDto: Walidacja request body
- CreateAppointmentResponseDto: Struktura odpowiedzi
- ErrorDto: Standardowa struktura błędów
- ValidationErrorDto: Błędy walidacji z detalami

// Command Models  
- CreateAppointmentCommand: Logika biznesowa tworzenia wizyty

// Database Types
- AppointmentInsert: Typ dla INSERT operations
- AppointmentStatus: Enum dla statusów wizyt
- UserRole: Enum dla sprawdzenia ról użytkowników
- User: Typ tabeli users dla walidacji istnienia
```

## 4. Szczegóły odpowiedzi

**Sukces (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "e29b4400-550e-41d4-a716-446655440001",
  "staff_id": "41d4e29b-4400-550e-a716-446655440002", 
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T11:30:00Z",
  "status": "booked",
  "created_at": "2024-01-10T08:30:00Z",
  "updated_at": "2024-01-10T08:30:00Z"
}
```

**Błędy:**
- **400 Bad Request**: Nieprawidłowe dane wejściowe, błędne formaty
- **401 Unauthorized**: Brak lub nieprawidłowy token autoryzacji
- **403 Forbidden**: Niewystarczające uprawnienia
- **409 Conflict**: Konflikt czasowy, slot niedostępny
- **500 Internal Server Error**: Błąd bazy danych lub obliczeń

## 5. Przepływ danych

```
1. Request → Middleware autoryzacji
2. Walidacja request body (Zod schema)
3. Sprawdzenie uprawnień użytkownika (client/staff permissions)
4. AppointmentService.createAppointment(command)
5. Walidacja istnienia client_id i staff_id w bazie
6. Sprawdzenie ról użytkowników (client vs staff)
7. Obliczenie end_time na podstawie appointment_type
8. Sprawdzenie dostępności time slot (conflict detection)
9. INSERT do bazy danych z exclusion constraint protection
10. Formatowanie odpowiedzi do CreateAppointmentResponseDto
11. Zwrócenie 201 Created z danymi wizyty
```

**Algorytm obliczania end_time:**
```typescript
function calculateEndTime(startTime: string, appointmentType: string): string {
  const start = new Date(startTime);
  const durationMinutes = appointmentType === 'first_visit' ? 90 : 60;
  const end = new Date(start.getTime() + (durationMinutes * 60 * 1000));
  return end.toISOString();
}
```

**Zapytanie sprawdzania konfliktów:**
```sql
-- Sprawdzenie nakładających się terminów
SELECT COUNT(*) FROM appointments 
WHERE staff_id = $1 
  AND status IN ('booked', 'blocked')
  AND tsrange($2::timestamp, $3::timestamp) && tsrange(start_time, end_time);
```

**INSERT z conflict handling:**
```sql
INSERT INTO appointments (client_id, staff_id, start_time, end_time, status, created_at, updated_at)
VALUES ($1, $2, $3, $4, 'booked', NOW(), NOW())
RETURNING *;
-- Exclusion constraint będzie rzucać błąd przy konflikcie
```

## 6. Względy bezpieczeństwa

**Autoryzacja i uprawnienia:**
- Weryfikacja tokenu JWT z Supabase
- Clients mogą tworzyć wizyty tylko dla siebie (client_id = own user_id)
- Staff może tworzyć wizyty dla wszystkich klientów
- Użycie context.locals.supabase dla session management

**Walidacja danych:**
- Sanityzacja wszystkich pól request body
- Walidacja UUID format dla client_id/staff_id
- Walidacja ISO8601 format dla start_time
- Walidacja enum values dla appointment_type
- Length limits dla client_note

**Walidacja ról i istnienia:**
- Sprawdzenie czy client_id odpowiada użytkownikowi z rolą 'client'
- Sprawdzenie czy staff_id odpowiada użytkownikowi z rolą 'staff'
- Walidacja czy użytkownicy faktycznie istnieją w systemie

**Ochrona przed atakami:**
- Parametryzowane zapytania SQL
- Input validation dla wszystkich pól
- Rate limiting dla tworzenia wizyt
- Protection przed appointment spam

**Business Logic Security:**
- Sprawdzenie working hours (opcjonalne)
- Walidacja przyszłych dat (nie można tworzyć wizyt w przeszłości)
- Double-booking prevention przez exclusion constraint

## 7. Obsługa błędów

| Kod | Scenariusz | Odpowiedź |
|-----|------------|-----------|
| 400 | Brakujące wymagane pola | `{"error": {"message": "Missing required fields: client_id, staff_id, start_time, appointment_type", "code": "MISSING_FIELDS"}}` |
| 400 | Nieprawidłowy UUID | `{"error": {"message": "Invalid UUID format for client_id or staff_id", "code": "INVALID_UUID"}}` |
| 400 | Nieprawidłowy format czasu | `{"error": {"message": "Invalid start_time format. Use ISO8601", "code": "INVALID_DATETIME"}}` |
| 400 | Nieprawidłowy appointment_type | `{"error": {"message": "Invalid appointment_type. Must be: first_visit, follow_up", "code": "INVALID_APPOINTMENT_TYPE"}}` |
| 400 | Wizyta w przeszłości | `{"error": {"message": "Cannot create appointments in the past", "code": "PAST_APPOINTMENT"}}` |
| 401 | Brak tokenu | `{"error": {"message": "Authentication required", "code": "UNAUTHORIZED"}}` |
| 403 | Niewystarczające uprawnienia | `{"error": {"message": "Cannot create appointment for other clients", "code": "FORBIDDEN"}}` |
| 403 | Nieprawidłowa rola staff_id | `{"error": {"message": "staff_id must refer to a user with staff role", "code": "INVALID_STAFF"}}` |
| 403 | Nieprawidłowa rola client_id | `{"error": {"message": "client_id must refer to a user with client role", "code": "INVALID_CLIENT"}}` |
| 409 | Konflikt czasowy | `{"error": {"message": "Time slot conflicts with existing appointment", "code": "TIME_SLOT_CONFLICT"}}` |
| 409 | Exclusion constraint violation | `{"error": {"message": "Appointment time slot is not available", "code": "SLOT_UNAVAILABLE"}}` |
| 500 | Błąd bazy danych | `{"error": {"message": "Internal server error", "code": "DATABASE_ERROR"}}` |

**Logowanie błędów:**
- Błędy 4xx: Info level z user ID, request data (bez sensitive info)
- Błędy 5xx: Error level z full stack trace
- Business rule violations: Warn level
- Successful creations: Info level z appointment ID

## 8. Rozważania dotyczące wydajności

**Optymalizacje bazy danych:**
- Wykorzystanie exclusion constraint dla automatycznej detekcji konfliktów
- Indeks na (staff_id, start_time, end_time) dla szybkich conflict checks
- Minimal data loading przy walidacji użytkowników
- Batch validation queries gdzie możliwe

**Conflict detection optimization:**
- Use database-level exclusion constraint jako primary protection
- Application-level pre-check dla user-friendly error messages
- Efficient range queries z tsrange PostgreSQL type

**Transaction management:**
- Atomic operations dla appointment creation
- Proper rollback przy constraint violations
- Connection pooling dla concurrent requests

**Monitoring i metryki:**
- Metryki success/failure rates
- Tracking conflict frequency
- Performance monitoring dla validation steps
- User behavior analytics (popular time slots)

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury plików
```bash
# Service layer enhancement
src/lib/services/AppointmentService.ts

# Endpoint API  
src/pages/api/appointments/index.ts

# Utility functions
src/lib/utils/dateCalculations.ts
```

### Krok 2: Implementacja walidacji (Zod schema)
```typescript
// Schema walidacji w AppointmentService
const createAppointmentRequestSchema = z.object({
  client_id: z.string().uuid(),
  staff_id: z.string().uuid(), 
  start_time: z.string().datetime(),
  appointment_type: z.enum(['first_visit', 'follow_up']),
  client_note: z.string().max(500).optional()
}).refine(data => {
  const startTime = new Date(data.start_time);
  const now = new Date();
  return startTime > now;
}, {
  message: "Cannot create appointments in the past"
});
```

### Krok 3: Implementacja funkcji obliczania czasu
- Utility functions dla end_time calculation
- Handling różnych appointment types
- Timezone considerations
- Edge cases dla boundary times

### Krok 4: Implementacja AppointmentService.createAppointment()
- User existence validation (client_id, staff_id)
- Role validation (client vs staff roles)
- Permission checks (client creating for self vs staff creating for others)
- Conflict detection i handling

### Krok 5: Database operations implementation
- INSERT with proper error handling
- Exclusion constraint violation catching
- Transaction management
- Proper data mapping to response DTO

### Krok 6: Implementacja API endpoint
- Route handler w src/pages/api/appointments/index.ts
- Request body parsing i validation
- Authorization middleware integration
- Error handling i proper status codes
- Response formatting
