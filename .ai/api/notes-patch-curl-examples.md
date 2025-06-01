# PATCH /api/notes/{id} - Curl Examples

## Overview

Endpoint do aktualizacji treści istniejącej notatki. Tylko autor notatki może ją edytować.

**URL:** `PATCH http://localhost:3000/api/notes/{id}`

## Successful Requests

### 1. Basic Update Request

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated note content with additional observations."
  }'
```

**Expected Response (200 OK):**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "Updated note content with additional observations.",
  "updated_at": "2024-01-15T11:30:00.000Z"
}
```

### 2. Update with Long Content

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a very detailed note with extensive observations about the patient'\''s condition. The patient showed significant improvement in their symptoms over the past week. Treatment plan should be continued with minor adjustments to medication dosage. Follow-up appointment recommended in 2 weeks."
  }'
```

### 3. Update with Special Characters

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Patient complained of chest pain (7/10 severity). Recommended ECG & blood tests. Symptoms: shortness of breath, fatigue. Next visit: 2024-02-01 @ 14:00."
  }'
```

## Error Scenarios

### 1. Missing Note ID in URL

```bash
curl -X PATCH "http://localhost:3000/api/notes/" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content"
  }'
```

**Expected Response (404 Not Found - Route not found):**

### 2. Invalid Note ID Format

```bash
curl -X PATCH "http://localhost:3000/api/notes/invalid-uuid" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content"
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid note ID format",
  "code": "INVALID_FORMAT"
}
```

### 3. Missing Request Body

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json"
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid JSON format",
  "code": "INVALID_JSON"
}
```

### 4. Empty Content

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": ""
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "content": ["Content cannot be empty"]
  }
}
```

### 5. Content Too Long

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "'$(printf '%*s' 10001 | tr ' ' 'a')'"
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "content": ["Content cannot exceed 10000 characters"]
  }
}
```

### 6. Missing Content Field

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "other_field": "value"
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "content": ["Required"]
  }
}
```

### 7. Invalid JSON Format

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content",
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid JSON format",
  "code": "INVALID_JSON"
}
```

### 8. Note Not Found

```bash
curl -X PATCH "http://localhost:3000/api/notes/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content"
  }'
```

**Expected Response (404 Not Found):**

```json
{
  "message": "Note not found",
  "code": "NOT_FOUND"
}
```

### 9. Access Denied (Not Note Author)

```bash
# This would happen when a user tries to edit someone else's note
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DIFFERENT_USER_TOKEN" \
  -d '{
    "content": "Trying to edit someone else'\''s note"
  }'
```

**Expected Response (403 Forbidden):**

```json
{
  "message": "Access denied. You can only edit your own notes",
  "code": "ACCESS_DENIED"
}
```

### 10. Multiple Validation Errors

```bash
curl -X PATCH "http://localhost:3000/api/notes/invalid-uuid" \
  -H "Content-Type: application/json" \
  -d '{
    "content": ""
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Invalid note ID format",
  "code": "INVALID_FORMAT"
}
```

## Advanced Testing

### 1. Test with Whitespace-Only Content

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "   \n\t  "
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "content": ["Content cannot be empty"]
  }
}
```

### 2. Test Content with Leading/Trailing Whitespace (Should be trimmed)

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "  Content with spaces around it  "
  }'
```

**Expected Response (200 OK):**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "Content with spaces around it",
  "updated_at": "2024-01-15T11:30:00.000Z"
}
```

### 3. Test with Unicode Characters

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Patient showed improvement 👍. Temperature: 36.5°C. Next visit: März 2024 🗓️"
  }'
```

## Testing Tips

1. **Use jq for pretty JSON output:**

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content"}' | jq
```

2. **Save response to file:**

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content"}' \
  -o update_note_response.json
```

3. **Include response headers:**

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content"}' \
  -i
```

4. **Verbose output for debugging:**

```bash
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content"}' \
  -v
```

5. **Test with file input:**

```bash
echo '{"content": "Content from file"}' > update_note.json
curl -X PATCH "http://localhost:3000/api/notes/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d @update_note.json
```

## Request/Response Reference

### Path Parameters

| Parameter | Type   | Required | Validation  | Description              |
| --------- | ------ | -------- | ----------- | ------------------------ |
| id        | string | Yes      | UUID format | ID of the note to update |

### Request Body

| Field   | Type   | Required | Validation             | Description              |
| ------- | ------ | -------- | ---------------------- | ------------------------ |
| content | string | Yes      | 1-10000 chars, trimmed | New content for the note |

### Response Codes

| Code | Description           | When                                     |
| ---- | --------------------- | ---------------------------------------- |
| 200  | OK                    | Note updated successfully                |
| 400  | Bad Request           | Invalid UUID, JSON, or validation errors |
| 403  | Forbidden             | User is not the author of the note       |
| 404  | Not Found             | Note doesn't exist                       |
| 500  | Internal Server Error | Database or unexpected errors            |

### Success Response Schema

```json
{
  "id": "string (UUID)",
  "content": "string",
  "updated_at": "string (ISO8601)"
}
```

### Error Response Schema

```json
{
  "message": "string",
  "code": "string",
  "field_errors": {
    "field_name": ["error_message"]
  }
}
```
