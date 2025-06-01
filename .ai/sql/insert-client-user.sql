-- Skrypt do dodania użytkownika CLIENT do bazy danych
-- ID z CLIENT_USER_ID w src/db/supabase.client.ts

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
  'e4ca431b-b0da-4683-8765-c624f8c5651a',
  'client@example.com',
  'Client',
  'User',
  '1990-03-15',
  '+48987654321',
  'client',
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
SELECT id, email, first_name, last_name, role FROM users WHERE id = 'e4ca431b-b0da-4683-8765-c624f8c5651a'; 