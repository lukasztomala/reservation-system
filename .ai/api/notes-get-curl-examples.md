# GET /api/notes - Curl Examples

## Overview

Endpoint do pobierania wszystkich notatek pacjenta ze wszystkich jego wizyt. Dostęp tylko dla staff.

**URL:** `GET http://localhost:3000/api/notes`

## Successful Requests

### 1. Basic Request - Get Patient Notes

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**

```json
{
  "notes": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "appointment_id": "456e7890-e12b-34d5-a678-426614174001",
      "appointment_date": "2024-01-15T10:00:00.000Z",
      "author_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
      "author_name": "Dr John Smith",
      "author_role": "staff",
      "content": "Patient showed improvement in symptoms.",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 2. Request with Pagination

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a&page=2&limit=10" \
  -H "Content-Type: application/json"
```

### 3. Request with Sorting (Ascending)

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a&sort=created_at&order=asc" \
  -H "Content-Type: application/json"
```

### 4. Request with All Parameters

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a&page=1&limit=5&sort=created_at&order=desc" \
  -H "Content-Type: application/json"
```

## Error Scenarios

### 1. Missing patient_id Parameter

```bash
curl -X GET "http://localhost:3000/api/notes" \
  -H "Content-Type: application/json"
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid query parameters",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "patient_id": ["Required"]
  }
}
```

### 2. Invalid patient_id Format

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=invalid-uuid" \
  -H "Content-Type: application/json"
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid query parameters",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "patient_id": ["Invalid patient ID format"]
  }
}
```

### 3. Invalid Page Number

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a&page=0" \
  -H "Content-Type: application/json"
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid query parameters",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "page": ["Number must be greater than or equal to 1"]
  }
}
```

### 4. Invalid Limit (Too High)

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a&limit=150" \
  -H "Content-Type: application/json"
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid query parameters",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "limit": ["Number must be less than or equal to 100"]
  }
}
```

### 5. Invalid Sort Field

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a&sort=invalid_field" \
  -H "Content-Type: application/json"
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid query parameters",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "sort": ["Invalid enum value. Expected 'created_at'"]
  }
}
```

### 6. Invalid Order Direction

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a&order=invalid" \
  -H "Content-Type: application/json"
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid query parameters",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "order": ["Invalid enum value. Expected 'asc' | 'desc'"]
  }
}
```

### 7. Patient Not Found

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json"
```

**Expected Response (404 Not Found):**

```json
{
  "message": "Patient not found",
  "code": "NOT_FOUND"
}
```

### 8. Access Denied (Non-Staff User)

```bash
# This would happen when middleware is implemented and a client user tries to access
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CLIENT_USER_TOKEN"
```

**Expected Response (403 Forbidden):**

```json
{
  "message": "Staff access required",
  "code": "ACCESS_DENIED"
}
```

## Testing Tips

1. **Use jq for pretty JSON output:**

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a" | jq
```

2. **Save response to file:**

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a" \
  -o patient_notes_response.json
```

3. **Include response headers:**

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a" \
  -i
```

4. **Verbose output for debugging:**

```bash
curl -X GET "http://localhost:3000/api/notes?patient_id=e4ca431b-b0da-4683-8765-c624f8c5651a" \
  -v
```

## Query Parameters Reference

| Parameter  | Type   | Required | Default      | Validation          | Description                |
| ---------- | ------ | -------- | ------------ | ------------------- | -------------------------- |
| patient_id | string | Yes      | -            | UUID format         | ID of the patient          |
| page       | number | No       | 1            | >= 1                | Page number for pagination |
| limit      | number | No       | 20           | 1-100               | Number of items per page   |
| sort       | string | No       | "created_at" | Enum: "created_at"  | Field to sort by           |
| order      | string | No       | "desc"       | Enum: "asc", "desc" | Sort order                 |
