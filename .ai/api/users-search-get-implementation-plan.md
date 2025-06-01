# API Endpoint Implementation Plan: GET /users/search

## 1. Przegląd punktu końcowego

Endpoint służy do wyszukiwania pacjentów (użytkowników z rolą 'client') po imieniu i nazwisku z wykorzystaniem fuzzy matching. Dostęp jest ograniczony wyłącznie do użytkowników z rolą 'staff'. Wyszukiwanie wykorzystuje indeks GIN z rozszerzeniem pg_trgm PostgreSQL dla wydajnego fuzzy search.

**Kluczowe funkcje:**
- Fuzzy search po pełnym imieniu (first_name + last_name)
- Paginacja wyników (limit 1-50)
- Autoryzacja tylko dla staff
- Zwraca podstawowe dane kontaktowe pacjentów

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/users/search?q={query}&limit={number}`
- **Parametry**:
  - **Wymagane**: 
    - `q` (string): Zapytanie wyszukiwania (imię/nazwisko)
  - **Opcjonalne**: 
    - `limit` (number): Liczba wyników (1-50, domyślnie 10)
- **Request Body**: Brak
- **Headers**: 
  - `Authorization: Bearer {token}` (wymagany)

## 3. Wykorzystywane typy

```typescript
// DTOs
- UserSearchRequestDto: Walidacja query parametrów
- UserSearchResponseDto: Struktura odpowiedzi API
- ErrorDto: Standardowa struktura błędów
- ValidationErrorDto: Błędy walidacji z detalami

// Command Models  
- SearchUsersCommand: Logika biznesowa wyszukiwania

// Database Types
- UserRole: Enum dla ról użytkowników
- User: Typ tabeli users z bazy danych
```

## 4. Szczegóły odpowiedzi

**Sukces (200 OK):**
```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "first_name": "Jan", 
      "last_name": "Kowalski",
      "email": "jan.kowalski@email.com",
      "phone": "+48123456789",
      "birth_date": "1990-05-15"
    }
  ],
  "total": 1
}
```

**Błędy:**
- **400 Bad Request**: Brak parametru q, nieprawidłowy limit
- **401 Unauthorized**: Brak lub nieprawidłowy token autoryzacji  
- **403 Forbidden**: Użytkownik nie ma roli staff
- **500 Internal Server Error**: Błąd bazy danych lub wewnętrzny

## 5. Przepływ danych

```
1. Request → Middleware autoryzacji
2. Walidacja query parametrów (Zod schema)
3. Sprawdzenie roli użytkownika (staff only)
4. UserSearchService.searchUsers(command)
5. Zapytanie do PostgreSQL z pg_trgm fuzzy search
6. Formatowanie wyników do UserSearchResponseDto
7. Zwrócenie odpowiedzi JSON
```

**Zapytanie SQL (aproximacja):**
```sql
SELECT id, first_name, last_name, email, phone, birth_date
FROM users 
WHERE role = 'client' 
  AND LOWER(CONCAT(first_name, ' ', last_name)) % LOWER($1)
ORDER BY similarity(LOWER(CONCAT(first_name, ' ', last_name)), LOWER($1)) DESC
LIMIT $2;
```

## 6. Względy bezpieczeństwa

**Autoryzacja:**
- Weryfikacja tokenu JWT z Supabase
- Sprawdzenie roli użytkownika (tylko 'staff')
- Użycie context.locals.supabase dla session management

**Walidacja danych:**
- Sanityzacja parametru q (usunięcie znaków specjalnych)
- Walidacja zakresu limit (1-50)
- Escaping parametrów zapytania SQL

**Ochrona przed atakami:**
- Parametryzowane zapytania SQL (ochrona przed SQL injection)
- Rate limiting (rozważyć implementację)
- Input length limits dla query string

**Prywatność danych:**
- Zwracanie tylko podstawowych danych kontaktowych
- Ukrywanie wrażliwych informacji (hasła, szczegóły medyczne)

## 7. Obsługa błędów

| Kod | Scenariusz | Odpowiedź |
|-----|------------|-----------|
| 400 | Brak parametru `q` | `{"error": {"message": "Search query is required", "code": "MISSING_QUERY"}}` |
| 400 | Nieprawidłowy `limit` | `{"error": {"message": "Limit must be between 1 and 50", "code": "INVALID_LIMIT"}}` |
| 401 | Brak tokenu | `{"error": {"message": "Authentication required", "code": "UNAUTHORIZED"}}` |
| 403 | Niewystarczające uprawnienia | `{"error": {"message": "Staff access required", "code": "FORBIDDEN"}}` |
| 500 | Błąd bazy danych | `{"error": {"message": "Internal server error", "code": "DATABASE_ERROR"}}` |

**Logowanie błędów:**
- Błędy 4xx: Info level z user ID
- Błędy 5xx: Error level z full stack trace
- Metryki performance dla monitorowania

## 8. Rozważania dotyczące wydajności

**Optymalizacje bazy danych:**
- Wykorzystanie istniejącego indeksu GIN z pg_trgm
- Limit wyników na poziomie SQL (max 50)
- Optymalizacja zapytania z similarity scoring

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury plików
```bash
# Utworzenie service layer
src/lib/services/UserSearchService.ts

# Endpoint API  
src/pages/api/users/search.ts
```

### Krok 2: Implementacja walidacji (Zod schema)
```typescript
// Utworzenie schema walidacji w UserSearchService
const searchRequestSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.number().min(1).max(50).default(10)
});
```

### Krok 3: Implementacja UserSearchService
- Fuzzy search z wykorzystaniem pg_trgm
- Walidacja parametrów wejściowych
- Formatowanie wyników do DTO

### Krok 4: Implementacja API endpoint
- Route handler w src/pages/api/users/search.ts
- Integracja z middleware autoryzacji
- Obsługa błędów i kodów statusu
