-- Skrypt do dodania użytkownika STAFF do bazy danych
-- ID z STAFF_USER_ID w src/db/supabase.client.ts

INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  birth_date,
  phone,
  role,
  created_at
) VALUES (
  '721a5ad5-aebb-4c67-8d4d-c5423995b61e',
  'staff@example.com',
  'Staff',
  'User',
  '1985-01-01',
  '+48123456789',
  'staff',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  birth_date = EXCLUDED.birth_date,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;

-- Sprawdzenie czy użytkownik został dodany
SELECT id, email, first_name, last_name, role FROM users WHERE id = '721a5ad5-aebb-4c67-8d4d-c5423995b61e'; 