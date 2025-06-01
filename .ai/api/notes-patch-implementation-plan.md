# API Endpoint Implementation Plan: Update Note Content

## 1. Przegląd punktu końcowego

Endpoint `PATCH /notes/:id` umożliwia aktualizację treści istniejącej notatki. Kluczowym ograniczeniem bezpieczeństwa jest to, że użytkownicy mogą edytować tylko swoje własne notatki. Endpoint obsługuje tylko aktualizację pola `content` - pozostałe pola notatki (takie jak author_id, appointment_id) pozostają niezmienione.

## 2. Szczegóły żądania

- **Metoda HTTP**: PATCH
- **Struktura URL**: `/api/notes/:id`
- **Parametry**:
  - **Wymagane**:
    - `id` (path parameter) - UUID notatki do aktualizacji
    - `content` (request body) - nowa treść notatki
  - **Opcjonalne**: Brak
- **Request Body**:
  ```json
  {
    "content": "string" // min 1 char, max 10000 chars
  }
  ```
- **Content-Type**: `application/json`
- **Autoryzacja**: Wymagana (Bearer token)

## 3. Wykorzystywane typy

### DTOs:

- `UpdateNoteRequestDto` - walidacja danych wejściowych
- `UpdateNoteResponseDto` - format odpowiedzi
- `ErrorDto` - format błędów
- `ValidationErrorDto` - szczegółowe błędy walidacji

### Command Models:

- `UpdateNoteCommand` - model biznesowy dla operacji aktualizacji

### Database Types:

- `NoteUpdate` - typ dla operacji UPDATE w bazie danych
- `Note` - typ encji notatki

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "id": "uuid",
  "content": "string",
  "updated_at": "ISO8601"
}
```

### Błędy:

- **400 Bad Request**: Nieprawidłowe dane wejściowe
- **401 Unauthorized**: Brak autoryzacji
- **403 Forbidden**: Brak uprawnień do edycji notatki
- **404 Not Found**: Notatka nie została znaleziona
- **500 Internal Server Error**: Błąd serwera

## 5. Przepływ danych

1. **Walidacja żądania**:

   - Sprawdzenie formatu UUID w parametrze `:id`
   - Walidacja request body za pomocą Zod schema
   - Sprawdzenie autoryzacji użytkownika

2. **Autoryzacja**:

   - Pobranie informacji o użytkowniku z tokena
   - Sprawdzenie czy notatka istnieje
   - Weryfikacja czy `author_id` notatki odpowiada ID zalogowanego użytkownika

3. **Aktualizacja**:

   - Wywołanie `NotesService.updateNote()`
   - Aktualizacja w bazie danych przez Supabase client
   - Zwrócenie zaktualizowanych danych

4. **Odpowiedź**:
   - Formatowanie odpowiedzi zgodnie z `UpdateNoteResponseDto`
   - Zwrócenie kodu 200 z zaktualizowanymi danymi

## 6. Względy bezpieczeństwa

### Uwierzytelnianie:

- Sprawdzenie obecności i ważności Bearer token
- Pobranie użytkownika z `context.locals.supabase.auth.getUser()`

### Autoryzacja:

- Weryfikacja własności notatki poprzez porównanie `author_id` z ID zalogowanego użytkownika
- Zwrócenie 403 Forbidden jeśli użytkownik nie jest właścicielem

### Walidacja danych:

- Sanityzacja treści notatki (usunięcie potencjalnie niebezpiecznego HTML/JS)
- Ograniczenie długości treści (max 10000 znaków)
- Sprawdzenie czy treść nie jest pusta

### Ochrona przed atakami:

- SQL Injection: Używanie Supabase client z parametryzowanymi zapytaniami
- XSS: Sanityzacja treści przed zapisem
- Rate limiting: Rozważenie implementacji w przyszłości

## 7. Obsługa błędów

### 400 Bad Request:

- Nieprawidłowy format UUID w parametrze `:id`
- Brak pola `content` w request body
- Pusta treść notatki
- Treść przekraczająca maksymalną długość
- Nieprawidłowy format JSON

### 401 Unauthorized:

- Brak tokena autoryzacji
- Nieprawidłowy lub wygasły token
- Użytkownik nie jest zalogowany

### 403 Forbidden:

- Użytkownik nie jest właścicielem notatki
- Próba edycji notatki innego użytkownika

### 404 Not Found:

- Notatka o podanym ID nie istnieje
- Notatka została usunięta

### 500 Internal Server Error:

- Błędy bazy danych
- Błędy połączenia z Supabase
- Nieoczekiwane błędy aplikacji

## 8. Rozważania dotyczące wydajności

### Optymalizacje:

- Używanie indeksu na `notes.id` (już istnieje jako PRIMARY KEY)
- Minimalne pole SELECT - tylko potrzebne dane
- Cache'owanie informacji o użytkowniku w ramach żądania

### Potencjalne wąskie gardła:

- Zapytanie autoryzacyjne (SELECT author_id WHERE id = ?)
- Można zoptymalizować przez łączenie z UPDATE w jednym zapytaniu

### Monitorowanie:

- Logowanie czasu wykonania zapytań
- Metryki liczby żądań i błędów
- Alerting przy wysokiej częstotliwości błędów

## 9. Etapy wdrożenia

### Krok 1: Utworzenie Zod schema dla walidacji

- Definicja `updateNoteRequestSchema` w `src/lib/validation/notes.ts`
- Walidacja UUID dla parametru ID
- Walidacja treści notatki (długość, format)

### Krok 2: Implementacja NotesService

- Utworzenie lub rozszerzenie `src/lib/services/notes.service.ts`
- Metoda `updateNote(id: string, content: string, userId: string)`
- Sprawdzenie autoryzacji i aktualizacja w jednym zapytaniu

### Krok 3: Utworzenie API endpoint

- Plik `src/pages/api/notes/[id].ts`
- Implementacja funkcji `PATCH`
- Integracja z NotesService
- Obsługa błędów

### Krok 4: Implementacja middleware autoryzacji

- Sprawdzenie tokena w `context.locals.supabase`
- Ekstrakcja użytkownika z sesji
- Przekazanie informacji o użytkowniku do endpoint
