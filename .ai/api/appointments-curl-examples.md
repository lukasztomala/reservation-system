# POST & GET /api/appointments - Curl Examples

This document provides curl examples for testing the `/api/appointments` endpoint with both GET and POST methods.

## Base Configuration

```bash
BASE_URL="http://localhost:3000"
ENDPOINT="/api/appointments"
# Sample JWT token for testing (replace with real token)
AUTH_TOKEN="your-jwt-token-here"
```

## POST /api/appointments - Create New Appointment

### Authentication Headers

All POST requests require authentication:

```bash
-H "Authorization: Bearer $AUTH_TOKEN" \
-H "Content-Type: application/json"
```

### 1. Create First Visit Appointment (120 minutes)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-20T10:00:00.000Z",
    "appointment_type": "first_visit",
    "client_note": "First consultation appointment"
  }'
```

### 2. Create Follow-up Appointment (60 minutes)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-20T14:00:00.000Z",
    "appointment_type": "follow_up"
  }'
```

### 3. Create Appointment with Long Client Note

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-21T09:00:00.000Z",
    "appointment_type": "first_visit",
    "client_note": "Patient has specific dietary restrictions and allergies. Previous treatments included acupuncture and herbal medicine. Looking for natural pain management solutions for chronic back pain."
  }'
```

### 4. Create Appointment for Different Time Zones

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-22T15:30:00.000Z",
    "appointment_type": "follow_up",
    "client_note": "Afternoon session"
  }'
```

## Error Testing - POST /api/appointments

### 5. Test Missing Authentication (401 Unauthorized)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-20T10:00:00.000Z",
    "appointment_type": "first_visit"
  }'
```

### 6. Test Invalid JSON (400 Bad Request)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "invalid-json"'
```

### 7. Test Missing Required Fields (400 Validation Error)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a"
  }'
```

### 8. Test Invalid UUID Format (400 Validation Error)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "invalid-uuid",
    "staff_id": "also-invalid",
    "start_time": "2024-12-20T10:00:00.000Z",
    "appointment_type": "first_visit"
  }'
```

### 9. Test Invalid Date Format (400 Validation Error)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-20 10:00:00",
    "appointment_type": "first_visit"
  }'
```

### 10. Test Invalid Appointment Type (400 Validation Error)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-20T10:00:00.000Z",
    "appointment_type": "invalid_type"
  }'
```

### 11. Test Past Appointment Date (400 Validation Error)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2023-01-01T10:00:00.000Z",
    "appointment_type": "first_visit"
  }'
```

### 12. Test Client Note Too Long (400 Validation Error)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-20T10:00:00.000Z",
    "appointment_type": "first_visit",
    "client_note": "'$(printf 'A%.0s' {1..501})'"
  }'
```

### 13. Test Non-existent Client ID (403 Forbidden)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "00000000-0000-0000-0000-000000000000",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-20T10:00:00.000Z",
    "appointment_type": "first_visit"
  }'
```

### 14. Test Non-existent Staff ID (403 Forbidden)

```bash
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "00000000-0000-0000-0000-000000000000",
    "start_time": "2024-12-20T10:00:00.000Z",
    "appointment_type": "first_visit"
  }'
```

### 15. Test Time Slot Conflict (409 Conflict)

```bash
# First create an appointment
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-20T10:00:00.000Z",
    "appointment_type": "first_visit"
  }'

# Then try to create overlapping appointment
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
    "start_time": "2024-12-20T11:00:00.000Z",
    "appointment_type": "follow_up"
  }'
```

## GET /api/appointments - List Appointments

### 16. Get All Appointments (Default Parameters)

```bash
curl -X GET "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json"
```

### 17. Filter by Client ID

```bash
curl -X GET "$BASE_URL$ENDPOINT?client_id=e4ca431b-b0da-4683-8765-c624f8c5651a" \
  -H "Content-Type: application/json"
```

### 18. Filter by Staff ID

```bash
curl -X GET "$BASE_URL$ENDPOINT?staff_id=721a5ad5-aebb-4c67-8d4d-c5423995b61e" \
  -H "Content-Type: application/json"
```

### 19. Filter by Status

```bash
curl -X GET "$BASE_URL$ENDPOINT?status=booked" \
  -H "Content-Type: application/json"
```

### 20. Filter by Date Range

```bash
curl -X GET "$BASE_URL$ENDPOINT?start_date=2024-12-01&end_date=2024-12-31" \
  -H "Content-Type: application/json"
```

### 21. Multiple Filters

```bash
curl -X GET "$BASE_URL$ENDPOINT?client_id=e4ca431b-b0da-4683-8765-c624f8c5651a&status=booked&start_date=2024-12-01" \
  -H "Content-Type: application/json"
```

### 22. Pagination

```bash
curl -X GET "$BASE_URL$ENDPOINT?page=2&limit=10" \
  -H "Content-Type: application/json"
```

### 23. Sorting by Start Time (Descending)

```bash
curl -X GET "$BASE_URL$ENDPOINT?sort=start_time&order=desc" \
  -H "Content-Type: application/json"
```

### 24. Sorting by Created At (Ascending)

```bash
curl -X GET "$BASE_URL$ENDPOINT?sort=created_at&order=asc" \
  -H "Content-Type: application/json"
```

### 25. Combined Filters, Pagination and Sorting

```bash
curl -X GET "$BASE_URL$ENDPOINT?staff_id=721a5ad5-aebb-4c67-8d4d-c5423995b61e&status=booked&page=1&limit=5&sort=start_time&order=desc" \
  -H "Content-Type: application/json"
```

## Error Testing - GET /api/appointments

### 26. Test Invalid Client ID Format (400 Validation Error)

```bash
curl -X GET "$BASE_URL$ENDPOINT?client_id=invalid-uuid" \
  -H "Content-Type: application/json"
```

### 27. Test Invalid Status Value (400 Validation Error)

```bash
curl -X GET "$BASE_URL$ENDPOINT?status=invalid_status" \
  -H "Content-Type: application/json"
```

### 28. Test Invalid Date Format (400 Validation Error)

```bash
curl -X GET "$BASE_URL$ENDPOINT?start_date=2024/12/01" \
  -H "Content-Type: application/json"
```

### 29. Test Invalid Page Number (400 Validation Error)

```bash
curl -X GET "$BASE_URL$ENDPOINT?page=0" \
  -H "Content-Type: application/json"
```

### 30. Test Invalid Limit (400 Validation Error)

```bash
curl -X GET "$BASE_URL$ENDPOINT?limit=101" \
  -H "Content-Type: application/json"
```

### 31. Test Invalid Sort Field (400 Validation Error)

```bash
curl -X GET "$BASE_URL$ENDPOINT?sort=invalid_field" \
  -H "Content-Type: application/json"
```

### 32. Test Invalid Order Value (400 Validation Error)

```bash
curl -X GET "$BASE_URL$ENDPOINT?order=invalid_order" \
  -H "Content-Type: application/json"
```

## Success Response Examples

### POST Success Response (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
  "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
  "start_time": "2024-12-20T10:00:00.000Z",
  "end_time": "2024-12-20T12:00:00.000Z",
  "status": "booked",
  "created_at": "2024-12-15T08:30:00.000Z",
  "updated_at": "2024-12-15T08:30:00.000Z"
}
```

### GET Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "client_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
        "staff_id": "721a5ad5-aebb-4c67-8d4d-c5423995b61e",
        "client_name": "John Doe",
        "staff_name": "Dr. Smith",
        "start_time": "2024-12-20T10:00:00.000Z",
        "end_time": "2024-12-20T12:00:00.000Z",
        "status": "booked",
        "cancellation_reason": null,
        "created_at": "2024-12-15T08:30:00.000Z",
        "updated_at": "2024-12-15T08:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

## Error Response Examples

### Validation Error (400 Bad Request)

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "field_errors": {
      "client_id": ["Invalid client_id format"],
      "start_time": ["Cannot create appointments in the past"]
    }
  }
}
```

### Authentication Error (401 Unauthorized)

```json
{
  "error": {
    "message": "Authentication required",
    "code": "UNAUTHORIZED"
  }
}
```

### Permission Error (403 Forbidden)

```json
{
  "error": {
    "message": "Cannot create appointment for other clients",
    "code": "FORBIDDEN"
  }
}
```

### Conflict Error (409 Conflict)

```json
{
  "error": {
    "message": "Time slot conflicts with existing appointment",
    "code": "TIME_SLOT_CONFLICT"
  }
}
```

## Testing Notes

1. **Authentication**: Replace `$AUTH_TOKEN` with a valid JWT token from your authentication system
2. **UUIDs**: Use real UUIDs from your database for client_id and staff_id
3. **Dates**: Ensure start_time is in the future when testing appointment creation
4. **Time Zones**: All timestamps should be in UTC (ISO8601 format with Z suffix)
5. **Appointment Types**:
   - `first_visit`: 120 minutes duration
   - `follow_up`: 60 minutes duration
6. **Status Values**: `booked`, `blocked`, `cancelled`
7. **Client Note**: Maximum 500 characters
