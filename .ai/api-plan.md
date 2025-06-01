# REST API Plan

## 1. Resources

The API is built around the following core resources mapped to database tables:

- **Users** (`users` table) - Client and staff user management with authentication
- **Appointments** (`appointments` table) - Appointment booking, scheduling, and management
- **Notes** (`notes` table) - Client and staff notes attached to appointments
- **Auth** (Supabase Auth) - Authentication and session management
- **AI** (External OpenRouter service) - AI-powered acupuncture recommendations

## 2. Endpoints

### Authentication Endpoints

#### POST /auth/register
Register a new client account
- **Query Parameters**: None
- **Request Body**:
```json
{
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string",
  "birth_date": "YYYY-MM-DD",
  "phone": "string"
}
```
- **Response Body**:
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "birth_date": "YYYY-MM-DD",
    "phone": "string",
    "role": "client"
  },
  "session": {
    "access_token": "string",
    "refresh_token": "string"
  }
}
```
- **Success**: 201 Created
- **Errors**: 400 Bad Request (validation errors), 409 Conflict (email/phone exists)

#### POST /auth/login
Authenticate existing user
- **Query Parameters**: None
- **Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
- **Response Body**:
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "role": "client|staff"
  },
  "session": {
    "access_token": "string",
    "refresh_token": "string"
  }
}
```
- **Success**: 200 OK
- **Errors**: 401 Unauthorized (invalid credentials)

#### POST /auth/logout
End user session
- **Query Parameters**: None
- **Request Body**: None
- **Response Body**: 
```json
{
  "message": "Successfully logged out"
}
```
- **Success**: 200 OK
- **Errors**: 401 Unauthorized

### User Endpoints

#### GET /users/search
Search for patients by name with fuzzy matching (staff only)
- **Query Parameters**: 
  - `q` (required): Search query for name
  - `limit` (optional): Number of results (default: 10, max: 50)
- **Request Body**: None
- **Response Body**:
```json
{
  "users": [
    {
      "id": "uuid",
      "first_name": "string",
      "last_name": "string",
      "email": "string",
      "phone": "string",
      "birth_date": "YYYY-MM-DD"
    }
  ],
  "total": "number"
}
```
- **Success**: 200 OK
- **Errors**: 401 Unauthorized, 403 Forbidden (non-staff), 400 Bad Request (missing query)

#### GET /users/me
Get current user profile
- **Query Parameters**: None
- **Request Body**: None
- **Response Body**:
```json
{
  "id": "uuid",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "birth_date": "YYYY-MM-DD",
  "phone": "string",
  "role": "client|staff",
  "created_at": "ISO8601"
}
```
- **Success**: 200 OK
- **Errors**: 401 Unauthorized

### Appointment Endpoints

#### GET /appointments
Get appointments list with filtering and pagination
- **Query Parameters**:
  - `client_id` (optional): Filter by client (staff only)
  - `staff_id` (optional): Filter by staff
  - `status` (optional): Filter by status (booked|blocked|cancelled)
  - `start_date` (optional): Filter from date (YYYY-MM-DD)
  - `end_date` (optional): Filter to date (YYYY-MM-DD)
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20, max: 100)
  - `sort` (optional): Sort field (start_time|created_at, default: start_time)
  - `order` (optional): Sort order (asc|desc, default: asc)
- **Request Body**: None
- **Response Body**:
```json
{
  "appointments": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "staff_id": "uuid",
      "client_name": "string",
      "start_time": "ISO8601",
      "end_time": "ISO8601",
      "status": "booked|blocked|cancelled",
      "cancellation_reason": "string|null",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "total_pages": "number"
  }
}
```
- **Success**: 200 OK
- **Errors**: 401 Unauthorized, 400 Bad Request (invalid parameters)

#### GET /appointments/available
Get available appointment slots for booking
- **Query Parameters**:
  - `start_date` (required): Start date (YYYY-MM-DD)
  - `end_date` (required): End date (YYYY-MM-DD, max 30 days from start_date)
  - `staff_id` (optional): Specific staff member
  - `appointment_type` (optional): first_visit|follow_up
- **Request Body**: None
- **Response Body**:
```json
{
  "available_slots": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "staff_id": "uuid",
      "staff_name": "string",
      "duration_hours": "number",
      "appointment_type": "first_visit|follow_up"
    }
  ],
  "working_hours": {
    "start": "HH:MM",
    "end": "HH:MM"
  }
}
```
- **Success**: 200 OK
- **Errors**: 401 Unauthorized, 400 Bad Request (invalid date range)

#### POST /appointments
Create new appointment
- **Query Parameters**: None
- **Request Body**:
```json
{
  "client_id": "uuid",
  "staff_id": "uuid",
  "start_time": "ISO8601",
  "appointment_type": "first_visit|follow_up",
  "client_note": "string"
}
```
- **Response Body**:
```json
{
  "id": "uuid",
  "client_id": "uuid",
  "staff_id": "uuid",
  "start_time": "ISO8601",
  "end_time": "ISO8601",
  "status": "booked",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```
- **Success**: 201 Created
- **Errors**: 400 Bad Request (validation/conflicts), 401 Unauthorized, 409 Conflict (time slot unavailable), 403 Forbidden

#### GET /appointments/:id
Get single appointment details
- **Query Parameters**: None
- **Request Body**: None
- **Response Body**:
```json
{
  "id": "uuid",
  "client_id": "uuid",
  "staff_id": "uuid",
  "client_name": "string",
  "staff_name": "string",
  "start_time": "ISO8601",
  "end_time": "ISO8601",
  "status": "booked|blocked|cancelled",
  "cancellation_reason": "string|null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```
- **Success**: 200 OK
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### PATCH /appointments/:id
Update appointment (cancel, modify status)
- **Query Parameters**: None
- **Request Body**:
```json
{
  "status": "cancelled|blocked",
  "cancellation_reason": "string"
}
```
- **Response Body**:
```json
{
  "id": "uuid",
  "status": "cancelled|blocked",
  "cancellation_reason": "string",
  "updated_at": "ISO8601"
}
```
- **Success**: 200 OK
- **Errors**: 400 Bad Request (missing cancellation_reason), 401 Unauthorized, 403 Forbidden, 404 Not Found

### Notes Endpoints

#### GET /appointments/:appointment_id/notes
Get notes for specific appointment
- **Query Parameters**: 
  - `author_role` (optional): Filter by author role (client|staff)
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20)
- **Request Body**: None
- **Response Body**:
```json
{
  "notes": [
    {
      "id": "uuid",
      "appointment_id": "uuid",
      "author_id": "uuid",
      "author_name": "string",
      "author_role": "client|staff",
      "content": "string",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```
- **Success**: 200 OK
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### POST /appointments/:appointment_id/notes
Create new note for appointment
- **Query Parameters**: None
- **Request Body**:
```json
{
  "content": "string"
}
```
- **Response Body**:
```json
{
  "id": "uuid",
  "appointment_id": "uuid",
  "author_id": "uuid",
  "author_role": "client|staff",
  "content": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```
- **Success**: 201 Created
- **Errors**: 400 Bad Request (empty content), 401 Unauthorized, 403 Forbidden, 404 Not Found

#### PATCH /notes/:id
Update existing note (own notes only)
- **Query Parameters**: None
- **Request Body**:
```json
{
  "content": "string"
}
```
- **Response Body**:
```json
{
  "id": "uuid",
  "content": "string",
  "updated_at": "ISO8601"
}
```
- **Success**: 200 OK
- **Errors**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found

#### GET /notes
Get patient notes across all appointments (staff only)
- **Query Parameters**:
  - `patient_id` (required): Patient ID to get notes for
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20)
  - `sort` (optional): created_at (default)
  - `order` (optional): asc|desc (default: desc)
- **Request Body**: None
- **Response Body**:
```json
{
  "notes": [
    {
      "id": "uuid",
      "appointment_id": "uuid",
      "appointment_date": "ISO8601",
      "author_id": "uuid",
      "author_name": "string",
      "author_role": "client|staff",
      "content": "string",
      "created_at": "ISO8601"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```
- **Success**: 200 OK
- **Errors**: 401 Unauthorized, 403 Forbidden (non-staff), 400 Bad Request

### AI Endpoints

#### POST /ai/recommendations
Generate acupuncture recommendations based on patient notes (staff only)
- **Query Parameters**: None
- **Request Body**:
```json
{
  "type": "all_notes|single_note",
  "patient_id": "uuid",
  "note_id": "uuid|null"
}
```
- **Response Body**:
```json
{
  "recommendations": [
    {
      "title": "string",
      "points": ["string"],
      "reasoning": "string",
      "confidence": "number",
      "tcm_principle": "string"
    }
  ],
  "input_summary": "string",
  "generated_at": "ISO8601"
}
```
- **Success**: 200 OK
- **Errors**: 400 Bad Request, 401 Unauthorized, 403 Forbidden (non-staff), 404 Not Found (patient/note), 500 Internal Server Error (AI service error), 503 Service Unavailable (AI service timeout)

## 3. Authentication and Authorization

### Authentication Mechanism
- **Type**: JWT-based authentication via Supabase Auth
- **Implementation**: 
  - Access tokens passed in `Authorization: Bearer <token>` header
  - Refresh tokens for automatic token renewal
  - Session management handled by Supabase client middleware in Astro
  - Token expiration: 1 hour (access), 30 days (refresh)

### Authorization Rules
- **Public endpoints**: `/auth/register`, `/auth/login`
- **Authenticated endpoints**: All other endpoints require valid session
- **Role-based access control**:
  - **Clients**: 
    - Can view and manage only their own appointments
    - Can create appointments
    - Can add client notes to their appointments
    - Can view their appointment history
    - Cannot access staff-only endpoints
  - **Staff**: 
    - Full access to all appointments and notes
    - Can search patients
    - Can generate AI recommendations
    - Can manage appointments for any client
    - Can add staff notes (visible only to staff)

### Resource Ownership
- Users can only modify resources they created (notes, appointments they booked)
- Staff members can modify any appointment or add staff notes
- Client notes are visible to both client and staff
- Staff notes are visible only to staff members

## 4. Validation and Business Logic

### User Validation
- **Email**: Valid format, unique constraint, required
- **Phone**: Valid format, unique constraint, required  
- **Password**: Minimum 8 characters, handled by Supabase Auth
- **Required fields**: first_name, last_name, birth_date, email, phone
- **Birth date**: Must be in the past, reasonable age limits (18-120 years)

### Appointment Validation
- **Time constraints**:
  - `start_time` must be in the future (minimum 1 hour ahead)
  - `end_time` must be after `start_time`
  - Working hours validation (e.g., 9:00-17:00)
- **Duration logic**: 
  - First visit: automatically set to 2 hours
  - Follow-up visit: automatically set to 1 hour
- **Conflict prevention**: 
  - Exclusion constraint prevents overlapping appointments for same staff
  - Double-booking validation before creation
- **References**: Valid client_id and staff_id must exist
- **Cancellation**: Requires `cancellation_reason` when `status = 'cancelled'`
- **Status transitions**: Only valid status changes allowed (booked → cancelled, booked → blocked)

### Notes Validation  
- **Content**: Non-empty after trimming whitespace, maximum 10,000 characters
- **References**: Valid appointment_id and author_id must exist
- **Authorization**: Author must be participant in the appointment (client or assigned staff)
- **Role consistency**: author_role must match actual user role

### Business Logic Implementation
- **Automatic Duration Calculation**: Based on appointment type (first_visit = 2h, follow_up = 1h)
- **Available Slots Calculation**: 
  - Consider existing appointments and blocked time slots
  - Apply working hours constraints
  - Show slots for next 30 days maximum
- **Note Visibility Rules**: 
  - Client notes: visible to both client and staff
  - Staff notes: visible only to staff members
- **Fuzzy Search**: PostgreSQL trigram indexes for patient name search with typo tolerance
- **Conflict Prevention**: Database-level exclusion constraints prevent staff double-booking
- **Access Control**: Middleware validates user permissions for each endpoint
- **Rate Limiting**: API rate limits to prevent abuse (100 requests/minute per user)
- **Audit Trail**: All appointment changes logged with timestamps and user information 