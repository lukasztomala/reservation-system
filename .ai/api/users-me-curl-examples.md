# Przykłady wywołań curl dla GET /api/users/me

Endpoint służy do pobierania profilu użytkownika CLIENT. **Nie wymaga autoryzacji** - zawsze zwraca dane użytkownika o ID `CLIENT_USER_ID`.

## Wymagania wstępne

Przed testowaniem endpoint potrzebujesz:

1. Uruchomionego serwera dev: `npm run dev`
2. Istniejącego użytkownika CLIENT w bazie danych (ID: `e4ca431b-b0da-4683-8765-c624f8c5651a`)

## Scenariusze testowe

### 1. ✅ Poprawne wywołanie (200 OK)

```bash
# Podstawowe wywołanie - bez autoryzacji
curl -X GET "http://localhost:3000/api/users/me" \
  -H "Content-Type: application/json" \
  -v

# Z dodatkowym formatowaniem odpowiedzi
curl -X GET "http://localhost:3000/api/users/me" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
```

**Oczekiwana odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "email": "client@example.com",
    "first_name": "Client",
    "last_name": "User",
    "birth_date": "1990-03-15",
    "phone": "+48987654321",
    "role": "client",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 2. ❌ Użytkownik CLIENT nie istnieje w bazie (404 Not Found)

```bash
# Ten scenariusz wystąpi jeśli użytkownik o ID CLIENT_USER_ID nie istnieje w tabeli users
curl -X GET "http://localhost:3000/api/users/me" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Oczekiwana odpowiedź (404):**

```json
{
  "success": false,
  "error": {
    "message": "User not found",
    "code": "USER_NOT_FOUND"
  }
}
```

### 3. ❌ Błąd bazy danych (500 Internal Server Error)

```bash
# Tego scenariusza nie można łatwo symulować przez curl
# Występuje przy problemach z połączeniem do Supabase lub błędach SQL
```

**Oczekiwana odpowiedź (500):**

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "DATABASE_ERROR"
  }
}
```

### 4. ❌ Brak klienta Supabase (500 Server Error)

```bash
# Ten scenariusz wystąpi jeśli middleware nie skonfiguruje context.locals.supabase
# Nie można symulować przez curl - błąd konfiguracji aplikacji
```

**Oczekiwana odpowiedź (500):**

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "SERVER_ERROR"
  }
}
```

## Testowanie podstawowe

### Szybki test działania

```bash
# Prosty test czy endpoint działa
curl -X GET "http://localhost:3000/api/users/me"

# Test z mierzeniem czasu odpowiedzi
curl -X GET "http://localhost:3000/api/users/me" \
  -w "Time: %{time_total}s\nStatus: %{http_code}\n" \
  -s -o /dev/null
```

### Test z verbose mode

```bash
# Debugging z pełnymi detalami HTTP
curl -X GET "http://localhost:3000/api/users/me" \
  -H "Content-Type: application/json" \
  -v
```

### Zapisanie odpowiedzi do pliku

```bash
# Zapisanie JSON response do pliku
curl -X GET "http://localhost:3000/api/users/me" \
  -H "Content-Type: application/json" \
  -o client-user-response.json \
  -w "HTTP Status: %{http_code}\n"

# Sprawdzenie zawartości pliku
cat client-user-response.json | jq '.'
```

## Automatyzacja testów

### Skrypt bash do testowania

```bash
#!/bin/bash

# Test script dla GET /users/me (bez autoryzacji)
BASE_URL="http://localhost:3000"

echo "=== Testing GET /users/me (CLIENT USER) ==="

echo "1. Basic test (should be 200 with CLIENT user data)"
curl -X GET "$BASE_URL/api/users/me" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo -e "\n2. Test with pretty JSON output"
curl -X GET "$BASE_URL/api/users/me" \
  -H "Content-Type: application/json" \
  -s | jq '.'

echo -e "\n3. Performance test"
curl -X GET "$BASE_URL/api/users/me" \
  -w "Response time: %{time_total}s\nStatus: %{http_code}\n" \
  -s -o /dev/null

echo -e "\n=== Tests completed ==="
```

## Różnica względem poprzedniej wersji

⚠️ **Ważne zmiany:**

- **Usunięto autoryzację JWT** - endpoint nie sprawdza już tokenu Authorization
- **Stały user ID** - zawsze zwraca dane użytkownika o ID `CLIENT_USER_ID`
- **Uproszczone testy** - brak testów scenariuszy autoryzacji (401)
- **Brak nagłówków Authorization** - wszystkie wywołania curl bez tokenów

## Notatki implementacyjne

- Endpoint używa `CLIENT_USER_ID` z `src/db/supabase.client.ts`
- Bez middleware autoryzacji - prosty dostęp do danych
- Obsługa błędów ograniczona do problemów z bazą danych (404, 500)
- Logowanie błędów na poziomie warn/error
- Typ `SupabaseClient` z `supabase.client.ts` zamiast generycznego
