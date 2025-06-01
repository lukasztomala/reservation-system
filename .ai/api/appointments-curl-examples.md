# GET /api/appointments/appointments - Curl Examples

This document provides curl examples for testing the `GET /api/appointments/appointments` endpoint without authentication.

## Base Configuration

```bash
BASE_URL="http://localhost:3000"
ENDPOINT="/api/appointments/appointments"
```

## Basic Requests

### 1. Get All Appointments (Default Parameters)

```bash
curl -X GET "$BASE_URL$ENDPOINT"
```

### 2. Basic Request with JSON Headers

```bash
curl -X GET "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json"
```

## Filtering Examples

### 3. Filter by Client ID

```bash
curl -X GET "$BASE_URL$ENDPOINT?client_id=e4ca431b-b0da-4683-8765-c624f8c5651a" \
  -H "Content-Type: application/json"
```

### 4. Filter by Staff ID

```bash
curl -X GET "$BASE_URL$ENDPOINT?staff_id=721a5ad5-aebb-4c67-8d4d-c5423995b61e" \
  -H "Content-Type: application/json"
```

### 5. Filter by Status

```bash
curl -X GET "$BASE_URL$ENDPOINT?status=booked" \
  -H "Content-Type: application/json"
```

### 6. Filter by Date Range

```bash
curl -X GET "$BASE_URL$ENDPOINT?start_date=2024-01-01&end_date=2024-12-31" \
  -H "Content-Type: application/json"
```

### 7. Multiple Filters

```bash
curl -X GET "$BASE_URL$ENDPOINT?client_id=e4ca431b-b0da-4683-8765-c624f8c5651a&status=booked&start_date=2024-01-01" \
  -H "Content-Type: application/json"
```

## Pagination Examples

### 8. Basic Pagination

```bash
curl -X GET "$BASE_URL$ENDPOINT?page=2&limit=10" \
  -H "Content-Type: application/json"
```

### 9. Pagination with Small Limit

```bash
curl -X GET "$BASE_URL$ENDPOINT?page=1&limit=5" \
  -H "Content-Type: application/json"
```

### 10. Pagination with Maximum Limit

```bash
curl -X GET "$BASE_URL$ENDPOINT?page=1&limit=100" \
  -H "Content-Type: application/json"
```

## Sorting Examples

### 11. Sort by Start Time (Ascending)

```bash
curl -X GET "$BASE_URL$ENDPOINT?sort=start_time&order=asc" \
  -H "Content-Type: application/json"
```

### 12. Sort by Start Time (Descending)

```bash
curl -X GET "$BASE_URL$ENDPOINT?sort=start_time&order=desc" \
  -H "Content-Type: application/json"
```

### 13. Sort by Created Date (Newest First)

```bash
curl -X GET "$BASE_URL$ENDPOINT?sort=created_at&order=desc" \
  -H "Content-Type: application/json"
```

## Complex Queries

### 14. Complex Query with All Parameters

```bash
curl -X GET "$BASE_URL$ENDPOINT?client_id=e4ca431b-b0da-4683-8765-c624f8c5651a&status=booked&start_date=2024-01-01&end_date=2024-12-31&page=1&limit=20&sort=start_time&order=asc" \
  -H "Content-Type: application/json"
```

### 15. Staff View with Multiple Filters

```bash
curl -X GET "$BASE_URL$ENDPOINT?staff_id=721a5ad5-aebb-4c67-8d4d-c5423995b61e&status=blocked&page=1&limit=50&sort=created_at&order=desc" \
  -H "Content-Type: application/json"
```

## Validation Error Examples

### 16. Invalid Status

```bash
curl -X GET "$BASE_URL$ENDPOINT?status=invalid" \
  -H "Content-Type: application/json"
```

### 17. Invalid Client ID Format

```bash
curl -X GET "$BASE_URL$ENDPOINT?client_id=not-a-uuid" \
  -H "Content-Type: application/json"
```

### 18. Invalid Date Format

```bash
curl -X GET "$BASE_URL$ENDPOINT?start_date=2024/01/01" \
  -H "Content-Type: application/json"
```

### 19. Invalid Page Number

```bash
curl -X GET "$BASE_URL$ENDPOINT?page=0" \
  -H "Content-Type: application/json"
```

### 20. Limit Too High

```bash
curl -X GET "$BASE_URL$ENDPOINT?limit=101" \
  -H "Content-Type: application/json"
```

### 21. Invalid Sort Field

```bash
curl -X GET "$BASE_URL$ENDPOINT?sort=invalid_field" \
  -H "Content-Type: application/json"
```

### 22. Invalid Order Direction

```bash
curl -X GET "$BASE_URL$ENDPOINT?order=invalid" \
  -H "Content-Type: application/json"
```

## Testing with jq (JSON Parsing)

### 23. Pretty Print Response

```bash
curl -X GET "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json" | jq '.'
```

### 24. Extract Only Appointments

```bash
curl -X GET "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json" | jq '.data.appointments'
```

### 25. Extract Pagination Info

```bash
curl -X GET "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json" | jq '.data.pagination'
```

### 26. Count Results

```bash
curl -X GET "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json" | jq '.data.appointments | length'
```

## Environment Variable Setup

For easier testing, you can set up environment variables:

```bash
export APPOINTMENT_API_URL="http://localhost:3000/api/appointments/appointments"

# Then use in requests:
curl -X GET "$APPOINTMENT_API_URL?page=1&limit=10"
```

## Batch Testing Script

```bash
#!/bin/bash
BASE_URL="http://localhost:3000/api/appointments/appointments"

echo "Testing basic request..."
curl -X GET "$BASE_URL"

echo -e "\n\nTesting with pagination..."
curl -X GET "$BASE_URL?page=1&limit=5"

echo -e "\n\nTesting with sorting..."
curl -X GET "$BASE_URL?sort=start_time&order=desc"

echo -e "\n\nTesting validation error..."
curl -X GET "$BASE_URL?status=invalid"
```

## Notes

- All requests return JSON responses
- The endpoint supports both query string parameters and no parameters (defaults)
- Validation errors return detailed error information
- All date filters expect YYYY-MM-DD format
- UUID parameters must be valid UUIDs
- Pagination starts from page 1
- Default limit is 20, maximum is 100
- Default sort is by `start_time` in ascending order
