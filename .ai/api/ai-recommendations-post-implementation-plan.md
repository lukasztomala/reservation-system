# API Endpoint Implementation Plan: POST /ai/recommendations

## 1. Przegląd punktu końcowego

Endpoint `POST /ai/recommendations` generuje rekomendacje akupunkturowe na podstawie notatek pacjenta przy użyciu zewnętrznego serwisu AI. Dostęp ograniczony wyłącznie do personelu (staff). Endpoint umożliwia analizę wszystkich notatek pacjenta lub pojedynczej wybranej notatki.

**Kluczowe funkcjonalności:**

- Integracja z zewnętrznym serwisem AI (przez Openrouter.ai)
- Analiza notatek pacjenta w kontekście Tradycyjnej Medycyny Chińskiej (TCM)
- Generowanie spersonalizowanych rekomendacji punktów akupunkturowych
- Kontrola dostępu oparta na rolach użytkowników

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/ai/recommendations`
- **Headers wymagane:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` (z Supabase auth)

### Parametry:

- **Wymagane:**
  - `type`: "all_notes" | "single_note" - typ analizy
  - `patient_id`: UUID - identyfikator pacjenta
- **Warunkowo wymagane:**
  - `note_id`: UUID - wymagane gdy `type === "single_note"`

### Request Body:

```json
{
  "type": "all_notes|single_note",
  "patient_id": "uuid",
  "note_id": "uuid|null"
}
```

## 3. Wykorzystywane typy

### DTOs (już zdefiniowane w types.ts):

- `AIRecommendationRequestDto` - walidacja request body
- `AIRecommendationResponseDto` - struktura odpowiedzi
- `AIRecommendationDto` - pojedyncza rekomendacja
- `UserDto` - informacje o użytkowniku
- `NoteDto` - struktura notatki
- `ErrorDto` - obsługa błędów

### Command Models (nowe do utworzenia):

```typescript
interface GenerateAIRecommendationsCommand {
  patient_id: string;
  notes_content: string[];
  request_type: "all_notes" | "single_note";
  staff_id: string;
}

interface AIServiceRequest {
  patient_notes: string;
  context: {
    patient_age?: number;
    analysis_type: string;
  };
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "recommendations": [
    {
      "title": "Primary Point Selection",
      "points": ["LI4", "ST36", "SP3"],
      "reasoning": "Based on digestive symptoms mentioned...",
      "confidence": 0.85,
      "tcm_principle": "Tonifying Spleen Qi"
    }
  ],
  "input_summary": "Analysis of 3 notes spanning 2 months...",
  "generated_at": "2024-01-20T10:30:00Z"
}
```

### Kody błędów:

- **400:** Nieprawidłowe dane wejściowe, błędna walidacja
- **401:** Brak autoryzacji
- **403:** Użytkownik nie jest personelem
- **404:** Pacjent lub notatka nie została znaleziona
- **500:** Błąd serwisu AI lub błąd serwera
- **503:** Timeout serwisu AI

## 5. Przepływ danych

```
1. Walidacja żądania (Zod schema)
2. Weryfikacja autoryzacji (Supabase auth)
3. Sprawdzenie roli użytkownika (staff)
4. Pobranie danych pacjenta
5. Pobranie notatek (wszystkie lub pojedyncza)
6. Przygotowanie prompt dla AI
7. Wywołanie serwisu AI (Openrouter.ai)
8. Przetworzenie odpowiedzi AI
9. Zwrócenie sformatowanej odpowiedzi
```

### Interakcje z bazą danych:

- Pobranie użytkownika z tabeli `users` (weryfikacja roli)
- Pobranie pacjenta z tabeli `users` (weryfikacja istnienia)
- Pobranie notatek z tabeli `notes` poprzez `appointments`

### Integracja z zewnętrznym serwisem:

- Komunikacja z Openrouter.ai API
- Timeout handling (max 30s)
- Rate limiting według klucza API

## 6. Względy bezpieczeństwa

### Autoryzacja i uwierzytelnianie:

- Weryfikacja tokenu Supabase w middleware
- Sprawdzenie roli `staff` w tabeli `users`
- Walidacja dostępu do danych pacjenta

### Ochrona danych:

- Sanityzacja danych przed wysłaniem do AI
- Usunięcie danych osobowych z prompt (GDPR compliance)
- Logowanie dostępu do danych pacjenta (audit trail)

### Bezpieczeństwo komunikacji:

- HTTPS dla komunikacji z zewnętrznym API
- Ukrywanie kluczy API w zmiennych środowiskowych
- Rate limiting na poziomie endpointu (max 10 req/min per user)

### Walidacja danych:

```typescript
const requestSchema = z
  .object({
    type: z.enum(["all_notes", "single_note"]),
    patient_id: z.string().uuid(),
    note_id: z.string().uuid().optional(),
  })
  .refine((data) => {
    if (data.type === "single_note" && !data.note_id) {
      throw new Error("note_id is required for single_note type");
    }
    return true;
  });
```

## 7. Obsługa błędów

### 400 Bad Request:

- Nieprawidłowy format UUID
- Brakujący `note_id` dla typu `single_note`
- Nieprawidłowe wartości enum dla `type`

### 401 Unauthorized:

- Brakujący token autoryzacji
- Nieprawidłowy lub wygasły token

### 403 Forbidden:

- Użytkownik nie ma roli `staff`
- Brak uprawnień do danych pacjenta

### 404 Not Found:

- Pacjent o podanym ID nie istnieje
- Notatka o podanym ID nie istnieje
- Brak notatek dla pacjenta

### 500 Internal Server Error:

- Błąd połączenia z bazą danych
- Błąd parsowania odpowiedzi AI
- Nieoczekiwane błędy aplikacji

### 503 Service Unavailable:

- Timeout komunikacji z serwisem AI
- Serwis AI niedostępny
- Przekroczenie limitów API

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

- Czas odpowiedzi serwisu AI (5-30s)
- Rozmiar danych notatek dla analizy `all_notes`
- Limity rate limiting zewnętrznego API

### Strategie optymalizacji:

- Implementacja timeout dla wywołań AI (30s)
- Caching odpowiedzi AI dla identycznych zapytań (Redis, 1h TTL)
- Ograniczenie długości notatek wysyłanych do AI (max 10,000 znaków)
- Asynchroniczne przetwarzanie dla dużych zestawów notatek
- Connection pooling dla wywołań zewnętrznych

### Monitoring:

- Metryki czasu odpowiedzi
- Liczba błędów per endpoint
- Wykorzystanie limitów AI API
- Rozmiar wysyłanych danych

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie infrastruktury

- Utworzenie serwisu AI w `src/lib/services/ai.service.ts`
- Konfiguracja zmiennych środowiskowych dla Openrouter.ai
- Dodanie zależności HTTP client (fetch API)

### Krok 2: Implementacja walidacji

- Utworzenie Zod schema dla request validation
- Implementacja middleware autoryzacji
- Dodanie walidacji roli staff

### Krok 3: Implementacja logiki biznesowej

- Serwis pobierania notatek pacjenta
- Formatowanie danych dla prompt AI
- Implementacja wywołania serwisu AI

### Krok 4: Utworzenie endpointu API

- Plik `src/pages/api/ai/recommendations.ts`
- Implementacja handlera POST
- Integracja z serwisami

### Krok 5: Obsługa błędów i logowanie

- Implementacja comprehensive error handling
- Dodanie structured logging
- Konfiguracja monitoring

### Szczegółowa struktura plików:

```
src/
├── pages/api/ai/
│   └── recommendations.ts          # Main endpoint handler
├── lib/services/
│   ├── ai.service.ts              # AI service integration
│   ├── notes.service.ts           # Notes retrieval logic
│   └── user.service.ts            # User role validation
├── lib/validation/
│   └── ai-recommendations.schema.ts # Zod validation schemas
└── middleware/
    └── auth.middleware.ts         # Extended for role checking
```
