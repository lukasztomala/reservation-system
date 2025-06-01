# API Endpoint Implementation Plan: GET /appointments/:id

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania szczegółowych informacji o pojedynczym spotkaniu na podstawie jego unikalnego identyfikatora. Zwraca pełne dane spotkania wraz z informacjami o kliencie i personelu. Implementuje kontrolę dostępu - klienci widzą tylko swoje spotkania, personel widzi wszystkie.

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/appointments/{id}`
- **Parametry**:
  - **Wymagane**:
    - `id` (path parameter) - UUID spotkania
  - **Opcjonalne**: brak
- **Request Body**: brak
- **Headers**: Authorization header z Supabase session token

## 3. Wykorzystywane typy

### DTOs:

- `AppointmentDto` - struktura odpowiedzi zawierająca pełne informacje o spotkaniu
- `ErrorDto` - struktura odpowiedzi błędu
- `UserDto` - dla informacji o użytkownikach (pośrednio przez JOIN)

### Database Types:

- `Appointment` - tabela appointments
- `User` - tabela users (dla client_name i staff_name)

### Internal Types:

- `SupabaseClient` - klient bazy danych z kontekstu Astro

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "id": "uuid",
  "client_id": "uuid",
  "staff_id": "uuid",
  "client_name": "string",
  "staff_name": "string",
  "start_time": "ISO8601",
  "end_time": "ISO8601",
  "status": "booked|blocked|cancelled",
  "cancellation_reason": "string|null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Błędy:

- **400 Bad Request**: Nieprawidłowy format UUID
- **401 Unauthorized**: Brak autoryzacji
- **403 Forbidden**: Brak dostępu do spotkania
- **404 Not Found**: Spotkanie nie istnieje
- **500 Internal Server Error**: Błąd serwera/bazy danych

## 5. Przepływ danych

1. **Walidacja żądania**:

   - Sprawdzenie formatu UUID parametru id
   - Pobranie użytkownika z sesji Supabase

2. **Pobieranie danych**:

   - Query do bazy z JOIN na tabelach appointments i users
   - Pobranie appointment wraz z informacjami o kliencie i personelu

3. **Autoryzacja**:

   - Sprawdzenie czy użytkownik ma dostęp do spotkania
   - Client: tylko swoje spotkania (client_id = user.id)
   - Staff: wszystkie spotkania

4. **Formatowanie odpowiedzi**:
   - Transformacja danych do formatu AppointmentDto
   - Zwrócenie JSON response

## 6. Względy bezpieczeństwa

### Uwierzytelnienie:

- Weryfikacja sesji Supabase z `context.locals.supabase`
- Sprawdzenie ważności tokenu dostępu

### Autoryzacja:

- **Role-based access control**:
  - Client role: dostęp tylko do własnych spotkań
  - Staff role: dostęp do wszystkich spotkań
- Sprawdzenie client_id względem zalogowanego użytkownika

### Walidacja danych:

- Zod schema dla walidacji UUID
- Sanityzacja danych wejściowych
- Ochrona przed SQL injection (automatycznie przez Supabase client)

### Information disclosure:

- Nie ujawnianie szczegółów innych klientów dla role client
- Logowanie prób nieautoryzowanego dostępu

## 7. Obsługa błędów

### Scenariusze błędów:

1. **400 Bad Request**:

   - Nieprawidłowy format UUID
   - Komunikat: "Invalid appointment ID format"

2. **401 Unauthorized**:

   - Brak sesji użytkownika
   - Nieprawidłowy token
   - Komunikat: "Authentication required"

3. **403 Forbidden**:

   - Client próbuje dostać się do obcego spotkania
   - Komunikat: "Access denied to this appointment"

4. **404 Not Found**:

   - Spotkanie nie istnieje w bazie
   - Komunikat: "Appointment not found"

5. **500 Internal Server Error**:
   - Błędy bazy danych
   - Błędy połączenia z Supabase
   - Komunikat: "Internal server error"

### Error Logging:

- Logowanie wszystkich błędów z kontekstem
- Osobne logowanie prób nieautoryzowanego dostępu
- Nie logowanie wrażliwych danych w logach

## 8. Rozważania dotyczące wydajności

### Optymalizacje query:

- Wykorzystanie JOIN zamiast osobnych zapytań
- Indeksy na appointments.id (PRIMARY KEY)
- Indeksy na users.id (PRIMARY KEY)

### Caching:

- Brak cache'owania ze względu na wrażliwość danych medycznych
- Dane mogą się zmieniać dynamicznie

### Response time:

- Oczekiwany czas odpowiedzi < 200ms
- Monitoring wydajności query

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury plików

- `src/pages/api/appointments/[id].ts` - główny endpoint
- `src/lib/services/appointment.service.ts` - logika biznesowa (jeśli nie istnieje)

### Krok 2: Implementacja walidacji Zod

- Schema dla walidacji UUID parametru id
- Schema dla response (AppointmentDto)

### Krok 3: Implementacja AppointmentService

- Metoda `getAppointmentById(id: string, userId: string, userRole: UserRole)`
- Query z JOIN na appointments i users
- Logika autoryzacji

### Krok 4: Implementacja endpoint handler

- Pobranie parametru id z URL
- Walidacja formatu UUID
- Pobieranie użytkownika z sesji
- Wywołanie service
- Formatowanie odpowiedzi

### Krok 5: Obsługa błędów

- Try-catch bloki
- Mapowanie błędów na odpowiednie HTTP status codes
- Error logging

## 6. Przykład implementacji query

```sql
SELECT
  a.id,
  a.client_id,
  a.staff_id,
  a.start_time,
  a.end_time,
  a.status,
  a.cancellation_reason,
  a.created_at,
  a.updated_at,
  client.first_name || ' ' || client.last_name as client_name,
  staff.first_name || ' ' || staff.last_name as staff_name
FROM appointments a
JOIN users client ON a.client_id = client.id
LEFT JOIN users staff ON a.staff_id = staff.id
WHERE a.id = $1
```

## 7. Middleware considerations

- Wykorzystanie Astro middleware dla uwierzytelnienia
- Walidacja sesji na poziomie middleware
- Przekazanie user context do endpoint handler
