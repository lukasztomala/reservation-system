# cURL Examples - Users API Endpoints

## 🔍 Endpoint `/api/users/search`

### Podstawowe wyszukiwanie

```bash
# Wyszukanie użytkowników po imieniu "Łukasz"
curl -X GET "http://localhost:3000/api/users/search?q=Łukasz" \
  -H "Content-Type: application/json"
```

### Wyszukiwanie z limitem wyników

```bash
# Wyszukanie maksymalnie 5 użytkowników po nazwisku "kowalski"
curl -X GET "http://localhost:3000/api/users/search?q=kowalski&limit=5" \
  -H "Content-Type: application/json"
```

### Wyszukiwanie po pełnym imieniu

```bash
# Wyszukanie po pełnym imieniu (URL encoded)
curl -X GET "http://localhost:3000/api/users/search?q=jan%20kowalski&limit=10" \
  -H "Content-Type: application/json"
```

### Wyszukiwanie z polskimi znakami

```bash
# Wyszukiwanie z polskimi znakami diakrytycznymi
curl -X GET "http://localhost:3000/api/users/search?q=Paweł%20Żółć&limit=10" \
  -H "Content-Type: application/json"
```

### Testy walidacji - błędne zapytania

```bash
# Test bez parametru q (błąd 400)
curl -X GET "http://localhost:3000/api/users/search" \
  -H "Content-Type: application/json"

# Test z pustym query (błąd 400)
curl -X GET "http://localhost:3000/api/users/search?q=" \
  -H "Content-Type: application/json"

# Test z nieprawidłowym limitem - za duży (błąd 400)
curl -X GET "http://localhost:3000/api/users/search?q=jan&limit=100" \
  -H "Content-Type: application/json"

# Test z nieprawidłowym limitem - ujemny (błąd 400)
curl -X GET "http://localhost:3000/api/users/search?q=jan&limit=-5" \
  -H "Content-Type: application/json"

# Test z nieprawidłowym limitem - zero (błąd 400)
curl -X GET "http://localhost:3000/api/users/search?q=jan&limit=0" \
  -H "Content-Type: application/json"
```

## 👤 Endpoint `/api/users/me`

### Pobieranie profilu użytkownika

```bash
# Pobieranie danych aktualnego użytkownika
curl -X GET "http://localhost:3000/api/users/me" \
  -H "Content-Type: application/json"
```

## 📋 Przykłady odpowiedzi

### ✅ Sukces - `/api/users/search`

```bash
curl -X GET "http://localhost:3000/api/users/search?q=jan&limit=2"

# Oczekiwana odpowiedź (200 OK):
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "first_name": "Jan",
        "last_name": "Kowalski",
        "email": "jan.kowalski@email.com",
        "phone": "+48123456789",
        "birth_date": "1990-05-15"
      },
      {
        "id": "660f9511-f30c-52e5-b827-557766551111",
        "first_name": "Janusz",
        "last_name": "Nowak",
        "email": "janusz.nowak@email.com",
        "phone": "+48987654321",
        "birth_date": "1985-03-22"
      }
    ],
    "total": 2
  }
}
```

### ✅ Sukces - brak wyników

```bash
curl -X GET "http://localhost:3000/api/users/search?q=nieznaneimiexyz"

# Oczekiwana odpowiedź (200 OK):
{
  "success": true,
  "data": {
    "users": [],
    "total": 0
  }
}
```

### ✅ Sukces - `/api/users/me`

```bash
curl -X GET "http://localhost:3000/api/users/me"

# Oczekiwana odpowiedź (200 OK):
{
  "success": true,
  "data": {
    "id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "email": "client@example.com",
    "first_name": "Jan",
    "last_name": "Kowalski",
    "birth_date": "1990-05-15",
    "phone": "+48123456789",
    "role": "client",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### ❌ Błąd - Brak parametru query (400 Bad Request)

```bash
curl -X GET "http://localhost:3000/api/users/search"

# Oczekiwana odpowiedź:
{
  "success": false,
  "error": {
    "message": "Search query is required",
    "code": "MISSING_QUERY"
  }
}
```

### ❌ Błąd - Nieprawidłowy limit (400 Bad Request)

```bash
curl -X GET "http://localhost:3000/api/users/search?q=jan&limit=100"

# Oczekiwana odpowiedź:
{
  "success": false,
  "error": {
    "message": "Limit must be between 1 and 50",
    "code": "INVALID_LIMIT"
  }
}
```

### ❌ Błąd - Pusty query (400 Bad Request)

```bash
curl -X GET "http://localhost:3000/api/users/search?q="

# Oczekiwana odpowiedź:
{
  "success": false,
  "error": {
    "message": "Search query is required",
    "code": "MISSING_QUERY"
  }
}
```

### ❌ Błąd - Błąd walidacji z serwisu (400 Bad Request)

```bash
# Query za długi (>100 znaków)
curl -X GET "http://localhost:3000/api/users/search?q=$(printf 'a%.0s' {1..101})" \
  -H "Content-Type: application/json"

# Oczekiwana odpowiedź:
{
  "success": false,
  "error": {
    "message": "Validation error: Search query is too long",
    "code": "VALIDATION_ERROR"
  }
}
```

### ❌ Błąd serwera - Brak użytkownika (404 Not Found) - `/api/users/me`

```bash
# Jeśli CLIENT_USER_ID nie istnieje w bazie
curl -X GET "http://localhost:3000/api/users/me"

# Oczekiwana odpowiedź:
{
  "success": false,
  "error": {
    "message": "User not found",
    "code": "USER_NOT_FOUND"
  }
}
```

### ❌ Błąd serwera - Database Error (500 Internal Server Error)

```bash
# W przypadku błędu bazy danych
curl -X GET "http://localhost:3000/api/users/search?q=jan"

# Oczekiwana odpowiedź:
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "DATABASE_ERROR"
  }
}
```

## 🧪 Script testowy

Stwórz plik `test-users-api.sh`:

```bash
#!/bin/bash
# test-users-api.sh - Testy endpointów Users API

echo "=== Testing Users API Endpoints ==="

BASE_URL="http://localhost:3000"

echo -e "\n🔍 1. Testing /api/users/search - basic search"
curl -s -X GET "$BASE_URL/api/users/search?q=jan" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n🔍 2. Testing /api/users/search - with limit"
curl -s -X GET "$BASE_URL/api/users/search?q=kowalski&limit=5" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n🔍 3. Testing /api/users/search - full name search"
curl -s -X GET "$BASE_URL/api/users/search?q=jan%20kowalski&limit=10" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n❌ 4. Testing /api/users/search - missing query (should fail)"
curl -s -X GET "$BASE_URL/api/users/search" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n❌ 5. Testing /api/users/search - invalid limit too high (should fail)"
curl -s -X GET "$BASE_URL/api/users/search?q=jan&limit=100" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n❌ 6. Testing /api/users/search - invalid limit zero (should fail)"
curl -s -X GET "$BASE_URL/api/users/search?q=jan&limit=0" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n👤 7. Testing /api/users/me"
curl -s -X GET "$BASE_URL/api/users/me" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n🔍 8. Testing /api/users/search - edge case with special chars"
curl -s -X GET "$BASE_URL/api/users/search?q=test%40example" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n🔍 9. Testing /api/users/search - minimum limit"
curl -s -X GET "$BASE_URL/api/users/search?q=jan&limit=1" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n🔍 10. Testing /api/users/search - maximum limit"
curl -s -X GET "$BASE_URL/api/users/search?q=jan&limit=50" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n=== Tests completed ==="
```

## 🚀 Uruchomienie testów

```bash
# Nadaj uprawnienia wykonywania
chmod +x test-users-api.sh

# Uruchom testy (wymaga zainstalowanego jq dla formatowania JSON)
./test-users-api.sh

# Alternatywnie bez jq (surowy JSON):
sed 's/| jq/#| jq/g' test-users-api.sh | bash
```

## 📝 Notatki dotyczące implementacji

### Fuzzy Search Behavior

- **RPC Function**: Najlepsza wydajność z pg_trgm similarity scoring
- **Text Search**: Fallback z Supabase websearch
- **ILIKE Search**: Ostateczny fallback z pattern matching

### Performance Testing

```bash
# Test wydajności wyszukiwania
time curl -s -X GET "http://localhost:3000/api/users/search?q=jan&limit=10"

# Test wielu równoczesnych zapytań
for i in {1..10}; do
  curl -s -X GET "http://localhost:3000/api/users/search?q=test$i" &
done
wait
```

### URL Encoding Examples

```bash
# Spacje w query
curl -X GET "http://localhost:3000/api/users/search?q=jan%20kowalski"

# Polskie znaki
curl -X GET "http://localhost:3000/api/users/search?q=Paweł%20Żółć"

# Znaki specjalne (będą sanityzowane)
curl -X GET "http://localhost:3000/api/users/search?q=test%40example.com"
```

## 🛠️ Troubleshooting

### Problemy z połączeniem

```bash
# Sprawdź czy serwer działa
curl -I http://localhost:3000

# Test podstawowego endpointa
curl -X GET "http://localhost:3000/api/users/me"
```

### Debug odpowiedzi

```bash
# Pokaż headers HTTP
curl -v -X GET "http://localhost:3000/api/users/search?q=jan"

# Zapisz odpowiedź do pliku
curl -X GET "http://localhost:3000/api/users/search?q=jan" -o response.json
```

Wszystkie przykłady używają portu **3000** zgodnie z wymaganiem! 🎯
