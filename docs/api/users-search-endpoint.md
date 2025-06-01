# API Endpoint: GET /api/users/search

## Opis

Endpoint służy do wyszukiwania pacjentów (użytkowników z rolą 'client') po imieniu i nazwisku z wykorzystaniem zaawansowanego fuzzy matching PostgreSQL pg_trgm.

## Kluczowe funkcje

- **Fuzzy search** po pełnym imieniu (first_name + last_name)
- **Paginacja** wyników (limit 1-50, domyślnie 10)
- **Multi-level fallback** dla różnych metod wyszukiwania
- **Sortowanie** po similarity score (najlepsze dopasowania pierwsze)

## Struktura żądania

### URL

```
GET /api/users/search?q={query}&limit={number}
```

### Parametry query

| Parametr | Typ    | Wymagany | Opis                                                          |
| -------- | ------ | -------- | ------------------------------------------------------------- |
| `q`      | string | **TAK**  | Zapytanie wyszukiwania (imię/nazwisko, min 1, max 100 znaków) |
| `limit`  | number | NIE      | Liczba wyników (1-50, domyślnie 10)                           |

### Przykłady żądań

```bash
# Podstawowe wyszukiwanie
GET /api/users/search?q=jan

# Wyszukiwanie z limitem wyników
GET /api/users/search?q=kowalski&limit=20

# Wyszukiwanie po pełnym imieniu
GET /api/users/search?q=jan%20kowalski&limit=5
```

## Struktura odpowiedzi

### Sukces (200 OK)

```json
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
      }
    ],
    "total": 1
  }
}
```

### Błędy

#### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "message": "Search query is required",
    "code": "MISSING_QUERY"
  }
}
```

#### 400 Bad Request - Nieprawidłowy limit

```json
{
  "success": false,
  "error": {
    "message": "Limit must be between 1 and 50",
    "code": "INVALID_LIMIT"
  }
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "DATABASE_ERROR"
  }
}
```

## Algorytm wyszukiwania

Endpoint używa **multi-level fallback** dla optymalnej wydajności:

### 1. RPC Function (najlepsze dopasowanie)

- Używa custom PostgreSQL function `search_users_by_name`
- Wykorzystuje `pg_trgm` extension z `similarity()` function
- Sortuje wyniki według similarity score
- Próg podobieństwa: 0.1 (konfigurowalny)

### 2. Text Search (fallback)

- Używa Supabase `.textSearch()`
- Websearch type z konfiguracją 'english'
- Wyszukuje w virtual column `full_name`

### 3. ILIKE Search (ostateczny fallback)

- Podstawowe ILIKE matching z wildcards `%query%`
- Wyszukuje w `first_name` i `last_name` oddzielnie
- Sortowanie alfabetyczne po `first_name`

## Bezpieczeństwo

### Sanityzacja danych wejściowych

- Usuwanie znaków specjalnych (zachowanie polskich znaków)
- Trim whitespace
- Lowercase conversion
- Maksymalna długość query: 100 znaków

### Filtrowanie wyników

- Tylko użytkownicy z rolą `'client'`
- Limit wyników: maksymalnie 50
- Tylko podstawowe dane kontaktowe (bez wrażliwych danych)

## Performance

### Optymalizacje bazy danych

```sql
-- GIN index dla pg_trgm
CREATE INDEX users_name_trgm_idx
ON users USING GIN ((LOWER(first_name || ' ' || last_name)) gin_trgm_ops);
```

### Metryki wydajności

- RPC function: ~10-50ms
- Text search: ~50-100ms
- ILIKE fallback: ~100-200ms

## Instalacja PostgreSQL function

Aby włączyć najlepszą wydajność, wykonaj w Supabase SQL Editor:

```sql
-- Włącz pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Zainstaluj funkcję (patrz: docs/sql/search_users_function.sql)
-- Stwórz indeks GIN dla optymalnej wydajności
```

## Przykłady użycia

### JavaScript/TypeScript

```typescript
const response = await fetch("/api/users/search?q=jan&limit=10");
const result = await response.json();

if (result.success) {
  console.log(`Znaleziono ${result.data.total} użytkowników:`, result.data.users);
} else {
  console.error("Błąd wyszukiwania:", result.error.message);
}
```

### cURL

```bash
curl -X GET "http://localhost:4321/api/users/search?q=kowalski&limit=5" \
  -H "Content-Type: application/json"
```

## Rozwiązywanie problemów

### Brak wyników

1. Sprawdź czy query nie zawiera tylko znaków specjalnych
2. Upewnij się, że users mają rolę 'client'
3. Spróbuj z krótszym query (np. tylko imię)

### Powolne wyszukiwanie

1. Sprawdź czy pg_trgm extension jest włączone
2. Zweryfikuj istnienie indeksu GIN
3. Sprawdź logi dla fallback warnings

### Błędy 500

1. Sprawdź logi serwera dla szczegółów błędu
2. Zweryfikuj połączenie z bazą danych
3. Upewnij się, że tabela 'users' istnieje i ma odpowiednie kolumny
