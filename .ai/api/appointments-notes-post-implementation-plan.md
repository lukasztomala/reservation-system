# API Endpoint Implementation Plan: POST /appointments/:appointment_id/notes

## 1. Przegląd punktu końcowego

Endpoint służy do tworzenia nowych notatek dla konkretnego appointment. Pozwala zarówno klientom jak i personelowi medycznemu na dodawanie notatek do wizyty. Endpoint automatycznie określa rolę autora na podstawie zalogowanego użytkownika i weryfikuje uprawnienia dostępu do appointment.

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/appointments/:appointment_id/notes`
- **Parametry**:
  - **Wymagane**:
    - `appointment_id` (path parameter) - UUID appointment
    - `content` (request body) - treść notatki (string, nie może być pusta)
  - **Opcjonalne**: brak
- **Request Body**:

```json
{
  "content": "string"
}
```

- **Headers**: `Authorization: Bearer <token>` (wymagany)

## 3. Wykorzystywane typy

- **DTO Types**:

  - `CreateNoteRequestDto` - walidacja request body
  - `CreateNoteResponseDto` - struktura odpowiedzi
  - `ErrorDto` - obsługa błędów
  - `ValidationErrorDto` - błędy walidacji

- **Command Models**:

  - `CreateNoteCommand` - wewnętrzny model dla logiki biznesowej

- **Database Types**:
  - `NoteInsert` - wstawienie do bazy danych
  - `Note` - typ entity z bazy danych

## 4. Szczegóły odpowiedzi

- **Success (201 Created)**:

```json
{
  "id": "uuid",
  "appointment_id": "uuid",
  "author_id": "uuid",
  "author_role": "client|staff",
  "content": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

- **Error Responses**:
  - `400 Bad Request`: nieprawidłowe dane wejściowe
  - `401 Unauthorized`: brak autoryzacji
  - `403 Forbidden`: brak uprawnień do appointment
  - `404 Not Found`: appointment nie istnieje
  - `500 Internal Server Error`: błędy serwera

## 5. Przepływ danych

1. **Request Processing**:

   - Walidacja JWT token przez middleware
   - Walidacja appointment_id (UUID format)
   - Walidacja request body (Zod schema)

2. **Business Logic**:

   - Sprawdzenie czy appointment istnieje
   - Weryfikacja uprawnień użytkownika do appointment
   - Określenie author_role na podstawie roli użytkownika
   - Przygotowanie CreateNoteCommand

3. **Database Operations**:

   - Wstawienie nowej notatki do tabeli `notes`
   - Pobranie pełnych danych notatki z joinami

4. **Response Formation**:
   - Mapowanie danych na CreateNoteResponseDto
   - Zwrócenie odpowiedzi z kodem 201

## 6. Względy bezpieczeństwa

- **Autentykacja**: Weryfikacja JWT token przez Astro middleware
- **Autoryzacja**:
  - Klienci mogą dodawać notatki tylko do swoich appointments
  - Personel może dodawać notatki do appointments gdzie są przypisani jako staff
- **Walidacja danych**:
  - UUID validation dla appointment_id
  - Content sanitization (podstawowa ochrona przed XSS)
  - Ograniczenie długości content (do rozważenia)
- **Rate Limiting**: Rozważenie implementacji w przyszłości
- **Audit Trail**: Automatyczne zapisywanie author_id i timestamps

## 7. Obsługa błędów

| Kod | Scenariusz                        | Obsługa                                                |
| --- | --------------------------------- | ------------------------------------------------------ |
| 400 | Pusty content, nieprawidłowy UUID | Walidacja Zod, zwrócenie ValidationErrorDto            |
| 401 | Brak/nieprawidłowy token          | Middleware autoryzacji                                 |
| 403 | Brak uprawnień do appointment     | Sprawdzenie czy user jest client/staff dla appointment |
| 404 | Appointment nie istnieje          | Zapytanie do bazy danych                               |
| 500 | Błędy bazy danych                 | Logowanie błędu, zwrócenie ogólnego ErrorDto           |

## 8. Rozważania dotyczące wydajności

- **Database Queries**:
  - Jeden query do sprawdzenia appointment i uprawnień
  - Jeden insert query dla notatki
  - Możliwa optymalizacja: połączenie w jedną transakcję
- **Indeksy**: Wykorzystanie istniejących indeksów na appointment_id
- **Caching**: Nie wymagane dla tego endpointu
- **Rate Limiting**: Rozważenie w przypadku nadużyć

## 9. Etapy wdrożenia

1. **Utworzenie Zod schemas**:

   - Schema dla CreateNoteRequestDto w `src/lib/validations/notes.ts`

2. **Implementacja NotesService**:

   - Utworzenie `src/lib/services/notes.service.ts`
   - Metoda `createNote(command: CreateNoteCommand)`
   - Walidacja biznesowa i interakcja z bazą danych

3. **Implementacja API endpoint**:

   - Utworzenie `src/pages/api/appointments/[appointment_id]/notes.ts`
   - Handler POST z walidacją i wywołaniem service
   - Proper error handling i response formatting
