# GET /api/appointments/available - Curl Examples

Endpoint do pobierania dostępnych terminów wizyt w określonym zakresie dat.

## Podstawowe informacje

- **URL**: `http://localhost:3000/api/appointments/available`
- **Metoda**: GET
- **Autoryzacja**: Brak (tymczasowo wyłączona)
- **Content-Type**: application/json

## Parametry Query

| Parametr           | Typ    | Wymagany | Opis                                                |
| ------------------ | ------ | -------- | --------------------------------------------------- |
| `start_date`       | string | ✅       | Data początkowa (YYYY-MM-DD)                        |
| `end_date`         | string | ✅       | Data końcowa (YYYY-MM-DD, max 30 dni od start_date) |
| `staff_id`         | UUID   | ❌       | Filtr po konkretnym pracowniku                      |
| `appointment_type` | enum   | ❌       | first_visit lub follow_up                           |

## 1. Happy Path - Podstawowe zapytania

### Podstawowe zapytanie

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21" \
  -H "Content-Type: application/json"
```

**Oczekiwana odpowiedź (200 OK):**

```json
{
  "success": true,
  "data": {
    "available_slots": [
      {
        "start_time": "2024-01-15T09:00:00Z",
        "end_time": "2024-01-15T11:00:00Z",
        "duration_hours": 2,
        "staff_id": "123e4567-e89b-12d3-a456-426614174000",
        "appointment_type": "first_visit"
      },
      {
        "start_time": "2024-01-15T13:00:00Z",
        "end_time": "2024-01-15T14:00:00Z",
        "duration_hours": 1,
        "staff_id": "123e4567-e89b-12d3-a456-426614174000",
        "appointment_type": "follow_up"
      }
    ],
    "working_hours": {
      "start": "09:00",
      "end": "17:00",
      "timezone": "Europe/Warsaw"
    }
  }
}
```

### Filtrowanie po konkretnym pracowniku

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21&staff_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json"
```

### Filtrowanie po typie wizyty - pierwsza wizyta (2 godziny)

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21&appointment_type=first_visit" \
  -H "Content-Type: application/json"
```

### Filtrowanie po typie wizyty - wizyta kontrolna (1 godzina)

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21&appointment_type=follow_up" \
  -H "Content-Type: application/json"
```

### Kombinacja filtrów

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-16&staff_id=123e4567-e89b-12d3-a456-426614174000&appointment_type=follow_up" \
  -H "Content-Type: application/json"
```

## 2. Błędy walidacji (400 Bad Request)

### Brak wymaganych parametrów

```bash
curl -X GET "http://localhost:3000/api/appointments/available" \
  -H "Content-Type: application/json"
```

**Oczekiwana odpowiedź (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "message": "start_date and end_date are required",
    "code": "MISSING_REQUIRED_PARAMS"
  }
}
```

### Nieprawidłowy format daty

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-13-15&end_date=2024-01-21" \
  -H "Content-Type: application/json"
```

**Oczekiwana odpowiedź (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "field_errors": {
      "start_date": ["Invalid date format"]
    }
  }
}
```

### Zbyt duży zakres dat (> 30 dni)

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-01&end_date=2024-03-01" \
  -H "Content-Type: application/json"
```

### Nieprawidłowy UUID dla staff_id

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21&staff_id=invalid-uuid" \
  -H "Content-Type: application/json"
```

### Nieprawidłowy appointment_type

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21&appointment_type=invalid_type" \
  -H "Content-Type: application/json"
```

### Data końcowa wcześniejsza niż początkowa

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-21&end_date=2024-01-15" \
  -H "Content-Type: application/json"
```

## 3. Edge Cases

### Minimalna data (dziś)

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=$(date +%Y-%m-%d)&end_date=$(date -d '+1 day' +%Y-%m-%d)" \
  -H "Content-Type: application/json"
```

### Maksymalny zakres (30 dni)

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Content-Type: application/json"
```

### Weekend (może nie mieć dostępnych terminów)

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-13&end_date=2024-01-14" \
  -H "Content-Type: application/json"
```

## 4. Performance Testing

### Test wydajności - równoczesne zapytania

```bash
# Uruchom 5 równoczesnych zapytań
for i in {1..5}; do
  curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21" \
    -H "Content-Type: application/json" &
done
wait
```

### Test z dużym zakresem dat

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-01&end_date=2024-01-30" \
  -H "Content-Type: application/json"
```

## 5. Debugging i Development

### Verbose output

```bash
curl -v -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21" \
  -H "Content-Type: application/json"
```

### Zapisz odpowiedź do pliku

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21" \
  -H "Content-Type: application/json" \
  -o response.json
```

### Check tylko nagłówki HTTP

```bash
curl -I "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21"
```

### Z dodatkowym nagłówkiem dla debugowania

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21" \
  -H "Content-Type: application/json" \
  -H "X-Debug: true"
```

## 6. Skrypt automatycznego testowania

```bash
#!/bin/bash
# test-appointments-available.sh

echo "=== Testing GET /api/appointments/available ==="
BASE_URL="http://localhost:3000/api/appointments/available"

# Test 1: Podstawowe zapytanie
echo "1. Basic request..."
curl -s -X GET "${BASE_URL}?start_date=2024-01-15&end_date=2024-01-21" \
  -H "Content-Type: application/json" | jq .

# Test 2: Brak parametrów
echo -e "\n2. Missing parameters..."
curl -s -X GET "${BASE_URL}" \
  -H "Content-Type: application/json" | jq .

# Test 3: Z filtrem staff_id
echo -e "\n3. With staff_id filter..."
curl -s -X GET "${BASE_URL}?start_date=2024-01-15&end_date=2024-01-21&staff_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" | jq .

# Test 4: Z filtrem appointment_type
echo -e "\n4. With appointment_type filter..."
curl -s -X GET "${BASE_URL}?start_date=2024-01-15&end_date=2024-01-21&appointment_type=first_visit" \
  -H "Content-Type: application/json" | jq .

echo -e "\n=== Tests completed ==="
```

## Quick Test

```bash
curl -X GET "http://localhost:3000/api/appointments/available?start_date=2024-01-15&end_date=2024-01-21" -H "Content-Type: application/json"
```

## Uwagi

- **Godziny pracy**: 09:00-17:00 (Europe/Warsaw)
- **Czas trwania wizyt**: first_visit = 2h, follow_up = 1h
- **Autoryzacja**: Tymczasowo wyłączona (TODO: implementacja)
- **Format odpowiedzi**: ApiResponse wrapper ze statusem success/error
- **Maksymalny zakres**: 30 dni między start_date a end_date
