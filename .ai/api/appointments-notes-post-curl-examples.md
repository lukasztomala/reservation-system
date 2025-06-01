# API Endpoint cURL Examples: POST /api/appointments/:appointment_id/notes

## Overview

These examples demonstrate how to test the POST endpoint for creating notes on appointments. The endpoint creates a new note for a specific appointment with proper validation and access control.

**Endpoint**: `POST /api/appointments/:appointment_id/notes`  
**Port**: 3000  
**Content-Type**: `application/json`

## Test Data

The current implementation uses hardcoded test data:

- **Test User ID**: `e4ca431b-b0da-4683-8765-c624f8c5651a` (CLIENT_USER_ID)
- **Test User Role**: `client`

## Successful Scenarios

### 1. Create Note Successfully (201 Created)

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Patient reported feeling much better after the treatment. Pain levels have decreased significantly."
  }'
```

**Expected Response** (201):

```json
{
  "id": "note-uuid-here",
  "appointment_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "author_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
  "author_role": "client",
  "content": "Patient reported feeling much better after the treatment. Pain levels have decreased significantly.",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

### 2. Create Note with Minimal Content (201 Created)

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "OK"
  }'
```

### 3. Create Note with Maximum Length Content (201 Created)

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "'"$(printf 'A%.0s' {1..5000})"'"
  }'
```

## Validation Error Scenarios (400 Bad Request)

### 4. Missing Content Field

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response** (400):

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "content": ["Required"]
  }
}
```

### 5. Empty Content

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": ""
  }'
```

**Expected Response** (400):

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "content": ["Content cannot be empty"]
  }
}
```

### 6. Content Too Long (>5000 characters)

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "'"$(printf 'A%.0s' {1..5001})"'"
  }'
```

**Expected Response** (400):

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "content": ["Content cannot exceed 5000 characters"]
  }
}
```

### 7. Content with Only Whitespace

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "   \n\t   "
  }'
```

**Expected Response** (400):

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "field_errors": {
    "content": ["Content cannot be empty"]
  }
}
```

### 8. Invalid Appointment ID Format

```bash
curl -X POST "http://localhost:3000/api/appointments/invalid-uuid-format/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This should fail due to invalid appointment ID"
  }'
```

**Expected Response** (400):

```json
{
  "message": "Invalid appointment ID format",
  "code": "INVALID_FORMAT"
}
```

### 9. Missing Appointment ID

```bash
curl -X POST "http://localhost:3000/api/appointments//notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This should fail due to missing appointment ID"
  }'
```

**Expected Response** (400):

```json
{
  "message": "Appointment ID is required",
  "code": "MISSING_PARAMETER"
}
```

### 10. Invalid JSON Format

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{"content": "Invalid JSON missing quote}'
```

**Expected Response** (400):

```json
{
  "message": "Invalid JSON format",
  "code": "INVALID_JSON"
}
```

## Access Control Error Scenarios

### 11. Appointment Not Found (404 Not Found)

```bash
curl -X POST "http://localhost:3000/api/appointments/00000000-0000-0000-0000-000000000000/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This appointment does not exist"
  }'
```

**Expected Response** (404):

```json
{
  "message": "Appointment not found",
  "code": "NOT_FOUND"
}
```

### 12. Access Denied - Wrong Client (403 Forbidden)

_Note: This will happen when the hardcoded test user tries to access an appointment that belongs to a different client_

```bash
curl -X POST "http://localhost:3000/api/appointments/11111111-1111-1111-1111-111111111111/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Trying to access appointment that belongs to different client"
  }'
```

**Expected Response** (403):

```json
{
  "message": "Access denied. You can only add notes to your own appointments",
  "code": "ACCESS_DENIED"
}
```

## Testing with Different Content Types

### 13. Content with Special Characters

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Patient has improved! 😊 Next visit: 2024-02-15 @ 10:00 AM. Notes: pain ↓ from 8/10 to 3/10."
  }'
```

### 14. Content with Newlines and Formatting

```bash
curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Session Summary:\n\n1. Patient arrived on time\n2. Discussed symptoms\n3. Applied treatment\n4. Scheduled follow-up\n\nNext steps: Continue medication"
  }'
```

## Performance Testing

### 15. Multiple Rapid Requests

```bash
# Create multiple notes quickly to test for race conditions
for i in {1..5}; do
  curl -X POST "http://localhost:3000/api/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/notes" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"Test note #$i created at $(date)\"}" &
done
wait
```

## Additional Testing Notes

### Setting Up Test Data

Before running these examples, ensure you have:

1. **Valid Appointment**: Create an appointment in your database with ID `a1b2c3d4-e5f6-7890-abcd-ef1234567890` where:

   - `client_id` = `e4ca431b-b0da-4683-8765-c624f8c5651a` (matches hardcoded test user)
   - `staff_id` = any valid staff user ID
   - `status` = `booked`

2. **Database Tables**: Ensure your database has the required tables (`appointments`, `notes`, `users`) with proper relationships.

### Debugging Tips

1. **Check Server Logs**: Monitor console output for detailed error information
2. **Database State**: Verify appointments and users exist before testing
3. **Network Issues**: Ensure the server is running on port 3000
4. **JSON Validation**: Use tools like `jq` to validate JSON before sending:

```bash
echo '{"content": "test"}' | jq '.'
```

### Expected Database Changes

Successful requests will create new records in the `notes` table with:

- `id`: Auto-generated UUID
- `appointment_id`: From URL parameter
- `author_id`: Hardcoded test user ID
- `author_role`: `client` (based on hardcoded role)
- `content`: Trimmed content from request
- `created_at`: Current timestamp
- `updated_at`: Current timestamp
