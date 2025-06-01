# API Endpoint: POST /api/ai/recommendations - cURL Examples

## Endpoint Overview

**URL:** `http://localhost:3000/api/ai/recommendations`  
**Method:** POST  
**Content-Type:** application/json

## Example 1: Generate Recommendations from All Patient Notes

**Scenario:** Analyze all notes for a patient to generate comprehensive acupuncture recommendations.

```bash
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all_notes",
    "patient_id": "e4ca431b-b0da-4683-8765-c624f8c5651a"
  }'
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "title": "Primary Point Selection",
        "points": ["LI4", "ST36", "SP3"],
        "reasoning": "Based on digestive symptoms and energy deficiency patterns noted across multiple sessions...",
        "confidence": 0.85,
        "tcm_principle": "Tonifying Spleen Qi and Harmonizing Digestion"
      },
      {
        "title": "Secondary Support Points",
        "points": ["ST6", "REN12", "SP6"],
        "reasoning": "Supporting points for digestive harmony and emotional balance...",
        "confidence": 0.78,
        "tcm_principle": "Calming Shen and Supporting Middle Jiao"
      }
    ],
    "input_summary": "Analysis of 5 notes (1,247 characters) using all_notes method",
    "generated_at": "2024-01-20T14:30:00.000Z"
  }
}
```

## Example 2: Generate Recommendations from Single Note

**Scenario:** Analyze a specific note to generate targeted recommendations.

```bash
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "single_note",
    "patient_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
    "note_id": "c1af57f9-b3af-4673-ad8a-cc215454c299"
  }'
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "title": "Acute Symptom Management",
        "points": ["LI4", "LV3", "GV20"],
        "reasoning": "Based on the specific symptoms mentioned in this session: headache and stress...",
        "confidence": 0.82,
        "tcm_principle": "Calming Liver Yang and Clearing Heat"
      }
    ],
    "input_summary": "Analysis of 1 note (234 characters) using single_note method",
    "generated_at": "2024-01-20T14:35:00.000Z"
  }
}
```

## Error Response Examples

### 1. Validation Error - Missing note_id for single_note (400)

```bash
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "single_note",
    "patient_id": "e4ca431b-b0da-4683-8765-c624f8c5651a"
  }'
```

**Response:**

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "field_errors": {
      "note_id": ["note_id is required when type is 'single_note'"]
    }
  },
  "success": false
}
```

### 2. Invalid UUID Format (400)

```bash
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all_notes",
    "patient_id": "invalid-uuid"
  }'
```

**Response:**

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "field_errors": {
      "patient_id": ["Patient ID must be a valid UUID"]
    }
  },
  "success": false
}
```

### 3. Patient Not Found (404)

```bash
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all_notes",
    "patient_id": "00000000-0000-4000-8000-000000000000"
  }'
```

**Response:**

```json
{
  "error": {
    "message": "Patient not found",
    "code": "PATIENT_NOT_FOUND"
  },
  "success": false
}
```

### 4. No Notes Found (400)

```bash
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all_notes",
    "patient_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'
```

**Response:**

```json
{
  "error": {
    "message": "No notes found for this patient",
    "code": "NO_NOTES_FOUND"
  },
  "success": false
}
```

### 5. AI Service Timeout (503)

```bash
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all_notes",
    "patient_id": "e4ca431b-b0da-4683-8765-c624f8c5651a"
  }'
```

**Response (when AI service times out):**

```json
{
  "error": {
    "message": "AI service request timeout",
    "code": "AI_SERVICE_TIMEOUT"
  },
  "success": false
}
```

### 6. Invalid JSON Format (400)

```bash
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all_notes",
    "patient_id": "e4ca431b-b0da-4683-8765-c624f8c5651a",
  }'
```

**Response:**

```json
{
  "error": {
    "message": "Invalid JSON in request body",
    "code": "INVALID_JSON"
  },
  "success": false
}
```

## Testing with Different Patients

### Example UUIDs for Testing

```bash
# Client/Patient UUIDs (example)
export PATIENT_1="e4ca431b-b0da-4683-8765-c624f8c5651a"
export PATIENT_2="f5db542c-c1eb-5794-9876-d735f9d6762b"

# Note UUIDs (example)
export NOTE_1="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
export NOTE_2="b2c3d4e5-f6a7-8901-bcde-f23456789012"
```

### Batch Testing Script

```bash
#!/bin/bash
# ai-recommendations-test.sh

echo "Testing AI Recommendations Endpoint..."

# Test 1: All notes
echo "1. Testing all_notes analysis..."
curl -s -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"all_notes\",\"patient_id\":\"$PATIENT_1\"}" | jq

# Test 2: Single note
echo "2. Testing single_note analysis..."
curl -s -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"single_note\",\"patient_id\":\"$PATIENT_1\",\"note_id\":\"$NOTE_1\"}" | jq

# Test 3: Validation error
echo "3. Testing validation error..."
curl -s -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"single_note\",\"patient_id\":\"$PATIENT_1\"}" | jq

# Test 4: Invalid UUID
echo "4. Testing invalid UUID..."
curl -s -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"all_notes\",\"patient_id\":\"invalid-uuid\"}" | jq

# Test 5: Patient not found
echo "5. Testing patient not found..."
curl -s -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"all_notes\",\"patient_id\":\"00000000-0000-4000-8000-000000000000\"}" | jq

echo "Testing completed."
```

### Individual Test Commands

```bash
# Test all notes analysis
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{"type":"all_notes","patient_id":"e4ca431b-b0da-4683-8765-c624f8c5651a"}'

# Test single note analysis
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{"type":"single_note","patient_id":"e4ca431b-b0da-4683-8765-c624f8c5651a","note_id":"f5db542c-c1eb-5794-9876-d735f9d6762b"}'

# Test validation error
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{"type":"single_note","patient_id":"e4ca431b-b0da-4683-8765-c624f8c5651a"}'

# Test invalid UUID
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{"type":"all_notes","patient_id":"invalid-uuid"}'
```

## Environment Variables

For easier testing, set up these environment variables:

```bash
# API Configuration
export API_BASE_URL="http://localhost:3000"
export CONTENT_TYPE="application/json"

# Test Data
export TEST_PATIENT_ID="e4ca431b-b0da-4683-8765-c624f8c5651a"
export TEST_NOTE_ID="f5db542c-c1eb-5794-9876-d735f9d6762b"
```

## Notes

- **AI Service Dependency:** Requires `OPENROUTER_API_KEY` environment variable
- **Timeout:** AI requests timeout after 30 seconds
- **Rate Limiting:** Consider implementing rate limiting in production
- **Data Privacy:** Patient data is sanitized before sending to AI service
- **JSON Format:** Ensure proper JSON formatting in request body
