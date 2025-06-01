# API Endpoint Implementation Plan: PATCH /appointments/:id

## 1. Przegląd punktu końcowego

Endpoint służy do aktualizacji statusu istniejącego terminu w systemie rezerwacji. Umożliwia anulowanie (`cancelled`) lub blokowanie (`blocked`) terminu wraz z obowiązkowym podaniem przyczyny zmiany statusu. Endpoint jest przeznaczony dla użytkowników z odpowiednimi uprawnieniami (personel lub klient będący właścicielem terminu).

## 2. Szczegóły żądania

- **Metoda HTTP**: PATCH
- **Struktura URL**: `/api/appointments/:id`
- **Parametry**:
  - **Wymagane**:
    - `id` (path parameter) - UUID identyfikator terminu
    - `status` (body) - enum: `"cancelled"` lub `"blocked"`
    - `cancellation_reason` (body) - string z przyczyną zmiany statusu
  - **Opcjonalne**: Brak
- **Request Body**:

```json
{
  "status": "cancelled|blocked",
  "cancellation_reason": "string"
}
```

## 3. Wykorzystywane typy

### DTOs:

- `UpdateAppointmentRequestDto` - walidacja danych wejściowych
- `UpdateAppointmentResponseDto` - struktura odpowiedzi
- `ErrorDto` - obsługa błędów
- `ValidationErrorDto` - błędy walidacji

### Command Models:

- `UpdateAppointmentCommand` - model komend dla logiki biznesowej
- `User` - typ użytkownika z kontekstu sesji
- `Appointment` - typ terminu z bazy danych

### Database Types:

- `AppointmentStatus` - enum statusów terminów
- `AppointmentUpdate` - typ do aktualizacji w bazie danych

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "id": "uuid",
  "status": "cancelled|blocked",
  "cancellation_reason": "string",
  "updated_at": "ISO8601"
}
```

### Błędy:

- **400 Bad Request**: Nieprawidłowe dane wejściowych
- **401 Unauthorized**: Brak autoryzacji
- **403 Forbidden**: Brak uprawnień do modyfikacji terminu
- **404 Not Found**: Termin nie został znaleziony
- **500 Internal Server Error**: Błąd serwera

## 5. Przepływ danych

1. **Walidacja parametrów**: Sprawdzenie formatu UUID i poprawności danych wejściowych
2. **Autentykacja**: Pobranie użytkownika z `context.locals.supabase`
3. **Pobranie terminu**: Zapytanie do bazy danych o istniejący termin
4. **Autoryzacja**: Sprawdzenie uprawnień użytkownika do modyfikacji terminu
5. **Walidacja biznesowa**: Sprawdzenie czy termin może być zaktualizowany
6. **Aktualizacja**: Wykonanie aktualizacji w bazie danych poprzez Supabase
7. **Odpowiedź**: Zwrócenie zaktualizowanych danych terminu

## 6. Względy bezpieczeństwa

### Autentykacja:

- Wymagana sesja użytkownika w `context.locals.supabase`
- Sprawdzenie ważności tokena autoryzacji

### Autoryzacja:

- **Klienci**: Mogą modyfikować tylko własne terminy
- **Personel**: Może modyfikować wszystkie terminy
- Sprawdzenie na podstawie `user.role` i `appointment.client_id`

### Walidacja danych:

- Validacja UUID formatu dla parametru `id`
- Sprawdzenie enum values dla `status`
- Walidacja długości i formatu `cancellation_reason`
- Sanityzacja danych wejściowych

## 7. Obsługa błędów

### 400 Bad Request:

- Nieprawidłowy format UUID w parametrze `id`
- Nieprawidłowa wartość `status` (nie `cancelled` ani `blocked`)
- Brak `cancellation_reason` lub pusty string
- `cancellation_reason` przekracza maksymalną długość

### 401 Unauthorized:

- Brak tokena autoryzacji
- Nieprawidłowy lub wygasły token
- Użytkownik nie istnieje w sesji

### 403 Forbidden:

- Klient próbuje modyfikować termin innego klienta
- Użytkownik nie ma uprawnień do danej operacji

### 404 Not Found:

- Termin o podanym ID nie istnieje
- Termin został już usunięty (soft delete)

### 500 Internal Server Error:

- Błędy połączenia z bazą danych
- Nieprzewidziane błędy aplikacji
- Błędy Supabase API

## 8. Rozważania dotyczące wydajności

### Optymalizacje:

- Wykorzystanie indeksów na `appointments.id` (PRIMARY KEY)
- Pojedyncze zapytanie do bazy danych dla aktualizacji
- Zwracanie tylko niezbędnych pól w odpowiedzi

### Potencjalne wąskie gardła:

- Sprawdzenie uprawnień może wymagać join z tabelą users
- Concurrent updates na tym samym terminie

### Strategie mitygacji:

- Implementacja optimistic locking z `updated_at` timestamp
- Cache'owanie informacji o rolach użytkowników
- Rate limiting dla przedmiotu chronienia przed spam'em

## 9. Etapy wdrożenia

### 1. Przygotowanie struktury plików

- Utworzenie `/src/pages/api/appointments/[id].ts`
- Import niezbędnych typów i zależności

### 2. Implementacja walidacji Zod

- Schema dla `UpdateAppointmentRequestDto`
- Walidacja parametru `id` jako UUID
- Walidacja enum'ów i wymaganych pól

### 3. Utworzenie/rozszerzenie AppointmentService

- Lokalizacja: `/src/lib/services/appointment.service.ts`
- Metoda `updateAppointmentStatus()`
- Logika autoryzacji i walidacji biznesowej

### 4. Implementacja endpoint handler

- Funkcja `PATCH` w pliku `[id].ts`
- Integracja z middleware autentykacji
- Obsługa błędów i zwracanie odpowiedzi

### 5. Implementacja autoryzacji

- Sprawdzenie roli użytkownika
- Walidacja ownership dla klientów
- Zwracanie odpowiednich kodów błędów
