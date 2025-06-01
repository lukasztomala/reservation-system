# API Endpoint Implementation Plan: GET /users/me

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania profilu aktualnie zalogowanego użytkownika. Jest to prosty endpoint odczytu, który zwraca pełne dane użytkownika na podstawie tokenu JWT przesłanego w nagłówku Authorization. Endpoint jest dostępny dla wszystkich ról użytkowników (client i staff) i zwraca dane tylko tego użytkownika, który wykonuje żądanie.

**Kluczowe funkcje:**
- Pobieranie danych profilu aktualnie zalogowanego użytkownika
- Autoryzacja przez JWT token z Supabase
- Zwracanie pełnych danych użytkownika (UserDto)
- Brak dodatkowych parametrów lub filtrów

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/users/me`
- **Parametry**:
  - **Wymagane**: Brak
  - **Opcjonalne**: Brak
- **Request Body**: Brak
- **Headers**: 
  - `Authorization: Bearer {token}` (wymagany)

## 3. Wykorzystywane typy

```typescript
// DTOs
- UserDto: Struktura odpowiedzi z danymi użytkownika
- ErrorDto: Standardowa struktura błędów

// Database Types
- User: Typ tabeli users z bazy danych
- UserRole: Enum dla ról użytkowników

// Brak Command Models - prosty read operation
```

## 4. Szczegóły odpowiedzi

**Sukces (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jan.kowalski@email.com",
  "first_name": "Jan",
  "last_name": "Kowalski", 
  "birth_date": "1990-05-15",
  "phone": "+48123456789",
  "role": "client",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Błędy:**
- **401 Unauthorized**: Brak lub nieprawidłowy token autoryzacji
- **500 Internal Server Error**: Błąd bazy danych lub wewnętrzny

## 5. Przepływ danych

```
1. Request → Middleware autoryzacji (Supabase JWT)
2. Ekstraktowanie user ID z tokenu JWT
3. UserService.getCurrentUser(userId)
4. Zapytanie do PostgreSQL: SELECT * FROM users WHERE id = $1
5. Formatowanie wyniku do UserDto
6. Zwrócenie odpowiedzi JSON
```

**Zapytanie SQL:**
```sql
SELECT id, email, first_name, last_name, birth_date, phone, role, created_at
FROM users 
WHERE id = $1;
```

## 6. Względy bezpieczeństwa

**Autoryzacja:**
- Weryfikacja tokenu JWT z Supabase
- Ekstraktowanie user ID z payload tokenu
- Użycie context.locals.supabase dla session management

**Bezpieczeństwo danych:**
- Zwracanie tylko danych właściciela tokenu
- Filtrowanie wrażliwych pól (np. hasła) na poziomie DTO
- Walidacja istnienia użytkownika w bazie danych

**Ochrona przed atakami:**
- Parametryzowane zapytania SQL
- Walidacja formatu UUID dla user ID
- Brak możliwości podejrzenia danych innych użytkowników

## 7. Obsługa błędów

| Kod | Scenariusz | Odpowiedź |
|-----|------------|-----------|
| 401 | Brak tokenu Authorization | `{"error": {"message": "Authentication required", "code": "UNAUTHORIZED"}}` |
| 401 | Nieprawidłowy/wygasły token | `{"error": {"message": "Invalid or expired token", "code": "INVALID_TOKEN"}}` |
| 404 | Użytkownik nie istnieje | `{"error": {"message": "User not found", "code": "USER_NOT_FOUND"}}` |
| 500 | Błąd bazy danych | `{"error": {"message": "Internal server error", "code": "DATABASE_ERROR"}}` |

**Logowanie błędów:**
- Błędy 401: Info level z attempted user ID (jeśli dostępny)
- Błędy 404: Warning level z user ID
- Błędy 500: Error level z full stack trace
- Access logs dla wszystkich żądań

## 8. Rozważania dotyczące wydajności

**Optymalizacje bazy danych:**
- Wykorzystanie indeksu PRIMARY KEY na kolumnie id (UUID)
- Pojedyncze zapytanie SELECT bez JOIN

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury plików
```bash
# Utworzenie service layer (jeśli nie istnieje)
src/lib/services/UserService.ts

# Endpoint API
src/pages/api/users/me.ts
```

### Krok 2: Implementacja UserService
```typescript
// Metoda getCurrentUser w UserService
async getCurrentUser(userId: string): Promise<UserDto>
- Zapytanie do bazy danych
- Mapowanie User -> UserDto
- Obsługa błędów (user not found)
```

### Krok 3: Implementacja API endpoint
- Route handler w src/pages/api/users/me.ts
- Integracja z Supabase auth middleware
- Ekstraktowanie user ID z JWT
- Wywołanie UserService.getCurrentUser()

### Krok 4: Obsługa błędów i kodów statusu
- Try-catch dla błędów bazy danych
- Standardowe struktury ErrorDto
- Proper HTTP status codes
