# Database Schema Design

## 1. Tables

### 1.1 users
This table is managed by Supabase Auth.

- id: UUID PRIMARY KEY
- first_name: VARCHAR NOT NULL
- last_name: VARCHAR NOT NULL
- birth_date: DATE NOT NULL
- email: VARCHAR NOT NULL UNIQUE
- phone: VARCHAR NOT NULL UNIQUE
- role: user_role NOT NULL

### 1.2 appointments
- id: UUID PRIMARY KEY
- client_id: UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
- staff_id: UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
- start_time: TIMESTAMP NOT NULL
- end_time: TIMESTAMP NOT NULL
- status: appointment_status NOT NULL DEFAULT 'booked'
- cancellation_reason: TEXT NULL
- created_at: TIMESTAMP NOT NULL DEFAULT now()
- CONSTRAINT chk_cancellation_reason CHECK (status <> 'cancelled' OR cancellation_reason IS NOT NULL)

### 1.3 notes
- id: UUID PRIMARY KEY
- appointment_id: UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT
- author_id: UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
- author_role: note_author_role NOT NULL
- content: TEXT NOT NULL
- created_at: TIMESTAMP NOT NULL DEFAULT now()

## 2. Relationships

- users ↔ appointments:
  - One user (client) can have many appointments (client_id)
  - One user (staff) can have many appointments (staff_id)
- appointments ↔ notes:
  - One appointment can have many notes (appointment_id)
- users ↔ notes:
  - One user (author) can write many notes (author_id)

## 3. Indexes

- B-tree on appointments(start_time)
- B-tree on appointments(end_time)
- B-tree on notes(appointment_id)
- GIN (pg_trgm) on LOWER(CONCAT(first_name, ' ', last_name)) in users for fuzzy name search

## 4. PostgreSQL Constructs

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enum types
typedef user_role AS ENUM ('client','staff');
typedef appointment_status AS ENUM ('booked','blocked','cancelled');
typedef note_author_role AS ENUM ('client','staff');

-- Exclusion constraint on appointments to prevent overlapping slots
ALTER TABLE appointments
  ADD EXCLUDE USING gist (
    staff_id WITH =,
    tsrange(start_time, end_time) WITH &&
  );
```

## 5. Additional Notes

- All foreign keys use ON DELETE RESTRICT to preserve data integrity.
- Row-Level Security (RLS) is omitted; authentication and authorization handled in application layer.
- Schema versioning and migrations to be managed via Supabase Migrations or Flyway.
- No partitioning in MVP; consider time-based partitioning of appointments for future scale. 