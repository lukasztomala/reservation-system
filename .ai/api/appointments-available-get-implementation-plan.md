# API Endpoint Implementation Plan: GET /appointments/available

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania dostępnych terminów wizyt w określonym zakresie dat. System generuje dostępne sloty czasowe na podstawie godzin pracy, wykluczając już zarezerwowane terminy. Dostępny dla wszystkich zalogowanych użytkowników z możliwością filtrowania po konkretnym pracowniku i typie wizyty.

**Kluczowe funkcje:**
- Generowanie dostępnych time slots w zadanym zakresie dat (max 30 dni)
- Wykluczanie zajętych terminów z bazy danych
- Filtrowanie po pracowniku i typie wizyty
- Różne czasy trwania dla first_visit vs follow_up
- Zwracanie informacji o working hours

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/appointments/available?start_date={date}&end_date={date}&staff_id={uuid}&appointment_type={type}`
- **Parametry**:
  - **Wymagane**: 
    - `start_date` (string): Data początkowa (YYYY-MM-DD)
    - `end_date` (string): Data końcowa (YYYY-MM-DD, max 30 dni od start_date)
  - **Opcjonalne**: 
    - `staff_id` (UUID): Filtr po konkretnym pracowniku
    - `appointment_type` (enum): first_visit|follow_up
- **Request Body**: Brak
- **Headers**: 
  - `Authorization: Bearer {token}` (wymagany)

## 3. Wykorzystywane typy

```typescript
// DTOs
- AvailableSlotsRequestDto: Walidacja query parametrów
- AvailableSlotsResponseDto: Struktura odpowiedzi API
- AvailableSlotDto: Pojedynczy dostępny slot
- ErrorDto: Standardowa struktura błędów
- ValidationErrorDto: Błędy walidacji z detalami

// Command Models  
- GenerateAvailableSlotsCommand: Logika biznesowa generowania slotów

// Database Types
- Appointment: Typ tabeli appointments dla sprawdzenia zajętości
- User: Typ tabeli users dla informacji o staff
```

## 4. Szczegóły odpowiedzi

**Sukces (200 OK):**
```json
{
  "available_slots": [
    {
      "date": "2024-01-15",
      "time": "10:00",
      "staff_id": "550e8400-e29b-41d4-a716-446655440000",
      "staff_name": "Dr Anna Kowalska",
      "duration_hours": 1.5,
      "appointment_type": "first_visit"
    },
    {
      "date": "2024-01-15",
      "time": "14:00",
      "staff_id": "550e8400-e29b-41d4-a716-446655440000",
      "staff_name": "Dr Anna Kowalska",
      "duration_hours": 1.0,
      "appointment_type": "follow_up"
    }
  ],
  "working_hours": {
    "start": "09:00",
    "end": "17:00"
  }
}
```

**Błędy:**
- **400 Bad Request**: Nieprawidłowe parametry, zakres dat > 30 dni
- **401 Unauthorized**: Brak lub nieprawidłowy token autoryzacji
- **500 Internal Server Error**: Błąd obliczeń lub bazy danych

## 5. Przepływ danych

```
1. Request → Middleware autoryzacji
2. Walidacja query parametrów (Zod schema)
3. AppointmentAvailabilityService.generateAvailableSlots(command)
4. Pobranie working hours z konfiguracji/bazy
5. Generowanie wszystkich możliwych time slots w zakresie dat
6. Zapytanie do bazy: SELECT zajęte terminy w zakresie
7. Filtrowanie dostępnych slotów (wykluczenie zajętych)
8. Mapowanie na staff information (JOIN users)
9. Formatowanie do AvailableSlotsResponseDto
10. Zwrócenie odpowiedzi JSON
```

**Algorytm generowania slotów:**
```typescript
// Pseudo-kod
function generateTimeSlots(startDate, endDate, workingHours, appointmentType) {
  const slots = [];
  const duration = appointmentType === 'first_visit' ? 90 : 60; // minutes
  
  for (date = startDate; date <= endDate; date++) {
    for (time = workingHours.start; time < workingHours.end; time += duration) {
      if (isSlotAvailable(date, time, duration)) {
        slots.push({date, time, duration, ...staffInfo});
      }
    }
  }
  return slots;
}
```

**Zapytanie SQL dla sprawdzenia zajętości:**
```sql
SELECT start_time, end_time, staff_id
FROM appointments 
WHERE status IN ('booked', 'blocked')
  AND start_time::date BETWEEN $1 AND $2
  AND ($3::uuid IS NULL OR staff_id = $3)
ORDER BY start_time;
```

## 6. Względy bezpieczeństwa

**Autoryzacja:**
- Weryfikacja tokenu JWT z Supabase
- Dostępne dla wszystkich zalogowanych użytkowników (client i staff)
- Użycie context.locals.supabase dla session management

**Walidacja danych:**
- Sanityzacja wszystkich query parametrów
- Walidacja formatów dat (YYYY-MM-DD)
- Walidacja zakresu dat (maksymalnie 30 dni)
- Walidacja UUID format dla staff_id
- Walidacja enum values dla appointment_type

**Ochrona przed atakami:**
- Parametryzowane zapytania SQL
- Rate limiting considerations (kosztowne obliczenia)
- Input validation dla wszystkich parametrów
- Limits na zakres dat (30 dni max)

**Business Logic Security:**
- Nie ujawnianie prywatnych informacji o innych appointments
- Tylko dostępne sloty, bez szczegółów zajętych terminów

## 7. Obsługa błędów

| Kod | Scenariusz | Odpowiedź |
|-----|------------|-----------|
| 400 | Brak start_date/end_date | `{"error": {"message": "start_date and end_date are required", "code": "MISSING_REQUIRED_PARAMS"}}` |
| 400 | Nieprawidłowy format daty | `{"error": {"message": "Invalid date format. Use YYYY-MM-DD", "code": "INVALID_DATE_FORMAT"}}` |
| 400 | Zakres dat > 30 dni | `{"error": {"message": "Date range cannot exceed 30 days", "code": "DATE_RANGE_TOO_LARGE"}}` |
| 400 | end_date przed start_date | `{"error": {"message": "end_date must be after start_date", "code": "INVALID_DATE_RANGE"}}` |
| 400 | Nieprawidłowy staff_id | `{"error": {"message": "Invalid staff_id UUID format", "code": "INVALID_UUID"}}` |
| 400 | Nieprawidłowy appointment_type | `{"error": {"message": "Invalid appointment_type. Must be: first_visit, follow_up", "code": "INVALID_APPOINTMENT_TYPE"}}` |
| 401 | Brak tokenu | `{"error": {"message": "Authentication required", "code": "UNAUTHORIZED"}}` |
| 500 | Błąd obliczeń | `{"error": {"message": "Internal server error", "code": "CALCULATION_ERROR"}}` |

**Logowanie błędów:**
- Błędy 4xx: Info level z user ID i parametrami
- Błędy 5xx: Error level z full stack trace
- Performance monitoring dla kosztownych obliczeń

## 8. Rozważania dotyczące wydajności

**Optymalizacje algorytmu:**
- Efektywne generowanie time slots bez nadmiarowych obliczeń
- Batch loading zajętych terminów jednym zapytaniem
- In-memory filtering zamiast wielu zapytań do bazy

**Optymalizacje bazy danych:**
- Wykorzystanie indeksów na start_time, end_time
- Indeks na (staff_id, start_time) dla filtrowania
- Minimal data loading (tylko potrzebne pola)

**Caching strategia:**
- Cache working hours (rzadko się zmieniają)
- Cache staff information
- Rozważyć short-term cache na popularne zakresy dat (5-10 min TTL)

**Performance considerations:**
- Limit na zakres dat (30 dni) zapobiega nadmiernym obliczeniom
- Lazy loading staff information tylko dla dostępnych slotów
- Monitoring czasu obliczeń dla różnych zakresów dat

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury plików
```bash
# Utworzenie service layer
src/lib/services/AppointmentAvailabilityService.ts

# Konfiguracja working hours
src/lib/config/workingHours.ts

# Endpoint API  
src/pages/api/appointments/available.ts
```

### Krok 2: Implementacja walidacji (Zod schema)
```typescript
// Schema walidacji w AppointmentAvailabilityService
const availableSlotsRequestSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staff_id: z.string().uuid().optional(),
  appointment_type: z.enum(['first_visit', 'follow_up']).optional()
}).refine(data => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 30 && diffDays >= 0;
}, {
  message: "Date range must be between 0 and 30 days"
});
```

### Krok 3: Implementacja working hours configuration
- Konfiguracja domyślnych godzin pracy
- Możliwość przyszłego rozszerzenia o różne godziny per staff
- Handling świąt i dni wolnych (future enhancement)

### Krok 4: Implementacja AppointmentAvailabilityService
- Algorytm generowania time slots
- Logika sprawdzania zajętości terminów
- Mapowanie na różne typy wizyt (duration)
- Optimized database queries

### Krok 5: Implementacja API endpoint
- Route handler w src/pages/api/appointments/available.ts
- Integracja z middleware autoryzacji
- Proper error handling i validation
- Response formatting
