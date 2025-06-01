# GET /appointments/:id - Curl Examples

## Overview

Przykłady wywołań curl dla endpointa `GET /api/appointments/{id}` do pobierania szczegółów pojedynczego spotkania.

**Base URL**: `http://localhost:3000`
**Endpoint**: `/api/appointments/{id}`
**Method**: GET

## Test Configuration

- **Test User ID**: `e4ca431b-b0da-4683-8765-c624f8c5651a` (CLIENT_USER_ID)
- **Test Role**: Można zmienić w kodzie między `staff` i `client`
- **Authentication**: Currently hardcoded (auth skipped)

## Valid Test Cases

### 1. Get Appointment Details (Staff Role)

```bash
# Staff może zobaczyć wszystkie spotkania
curl -X GET \
  "http://localhost:3000/api/appointments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
  "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
  "client_name": "Jan Kowalski",
  "staff_name": "Dr Anna Nowak",
  "start_time": "2024-02-15T10:00:00.000Z",
  "end_time": "2024-02-15T11:00:00.000Z",
  "status": "booked",
  "cancellation_reason": null,
  "created_at": "2024-02-10T08:00:00.000Z",
  "updated_at": "2024-02-10T08:00:00.000Z"
}
```

### 2. Get Own Appointment (Client Role)

```bash
# Client może zobaczyć tylko swoje spotkania
# Zmień testUserRole na "client" w kodzie przed testowaniem
curl -X GET \
  "http://localhost:3000/api/appointments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response (200 OK)** - gdy client_id = testUserId

### 3. Get Appointment with Verbose Output

```bash
# Pełne szczegóły odpowiedzi
curl -X GET \
  "http://localhost:3000/api/appointments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -v
```

## Error Test Cases

### 4. Invalid UUID Format (400 Bad Request)

```bash
# Nieprawidłowy format UUID
curl -X GET \
  "http://localhost:3000/api/appointments/invalid-uuid" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid appointment ID format",
  "code": "INVALID_FORMAT"
}
```

### 5. Missing Appointment ID (400 Bad Request)

```bash
# Brak ID w URL
curl -X GET \
  "http://localhost:3000/api/appointments/" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

### 6. Access Denied - Client Accessing Other's Appointment (403 Forbidden)

```bash
# Client próbuje dostać się do obcego spotkania
# Zmień testUserRole na "client" i użyj ID spotkania innego klienta
curl -X GET \
  "http://localhost:3000/api/appointments/999e8400-e29b-41d4-a716-446655440999" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response (403 Forbidden):**

```json
{
  "message": "Access denied to this appointment",
  "code": "ACCESS_DENIED"
}
```

### 7. Appointment Not Found (404 Not Found)

```bash
# Nieistniejące spotkanie
curl -X GET \
  "http://localhost:3000/api/appointments/999e8400-e29b-41d4-a716-446655440999" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response (404 Not Found):**

```json
{
  "message": "Appointment not found",
  "code": "NOT_FOUND"
}
```

### 8. Malformed UUID (400 Bad Request)

```bash
# UUID z błędną liczbą znaków
curl -X GET \
  "http://localhost:3000/api/appointments/550e8400-e29b-41d4-a716" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

### 9. UUID with Invalid Characters (400 Bad Request)

```bash
# UUID z nieprawidłowymi znakami
curl -X GET \
  "http://localhost:3000/api/appointments/550e8400-x29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

## Advanced Testing

### 10. Test with JSON Pretty Print

```bash
# Sformatowana odpowiedź JSON
curl -X GET \
  "http://localhost:3000/api/appointments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  | jq '.'
```

### 11. Test Response Time

```bash
# Pomiar czasu odpowiedzi
curl -X GET \
  "http://localhost:3000/api/appointments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -w "\nTotal time: %{time_total}s\n" \
  -o /dev/null \
  -s
```

### 12. Test Headers

```bash
# Sprawdzenie wszystkich nagłówków odpowiedzi
curl -X GET \
  "http://localhost:3000/api/appointments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -I
```

**Expected Headers:**

```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-cache, no-store, must-revalidate
```

## Batch Testing Script

```bash
#!/bin/bash
# Test script dla różnych scenariuszy

echo "=== Testing GET /appointments/:id ==="

echo "1. Valid appointment (Staff role):"
curl -s "http://localhost:3000/api/appointments/550e8400-e29b-41d4-a716-446655440000" | jq '.'

echo -e "\n2. Invalid UUID format:"
curl -s "http://localhost:3000/api/appointments/invalid" | jq '.'

echo -e "\n3. Non-existent appointment:"
curl -s "http://localhost:3000/api/appointments/999e8400-e29b-41d4-a716-446655440999" | jq '.'

echo -e "\n=== Tests completed ==="
```

## Notes

1. **Test Data**: Upewnij się, że masz odpowiednie dane testowe w bazie danych
2. **Role Testing**: Zmień `testUserRole` w kodzie między `"staff"` i `"client"` dla testowania autoryzacji
3. **Database**: Endpoint wymaga działającego połączenia z Supabase
4. **UUID Format**: Wszystkie ID muszą być w formacie UUID v4

## Common UUIDs for Testing

```
Valid UUIDs:
- 550e8400-e29b-41d4-a716-446655440000
- 6ba7b810-9dad-11d1-80b4-00c04fd430c8
- 123e4567-e89b-12d3-a456-426614174000

Test User IDs (from supabase.client.ts):
- CLIENT_USER_ID: e4ca431b-b0da-4683-8765-c624f8c5651a
- STAFF_USER_ID: 721a5ad5-aebb-4c67-8d4d-c5423995b61e
```
