-- PostgreSQL function for fuzzy user search using pg_trgm extension
-- To be executed in Supabase SQL Editor or PostgreSQL database

-- Ensure pg_trgm extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create or replace the search function
CREATE OR REPLACE FUNCTION search_users_by_name(
  search_query TEXT,
  search_limit INTEGER DEFAULT 10,
  role_filter TEXT DEFAULT 'client',
  min_similarity FLOAT DEFAULT 0.1
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  birth_date TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.birth_date,
    GREATEST(
      similarity(LOWER(u.first_name), LOWER(search_query)),
      similarity(LOWER(u.last_name), LOWER(search_query)),
      similarity(LOWER(CONCAT(u.first_name, ' ', u.last_name)), LOWER(search_query))
    ) as similarity_score
  FROM users u
  WHERE 
    u.role = role_filter::user_role
    AND (
      LOWER(u.first_name) % LOWER(search_query) OR
      LOWER(u.last_name) % LOWER(search_query) OR
      LOWER(CONCAT(u.first_name, ' ', u.last_name)) % LOWER(search_query)
    )
    AND GREATEST(
      similarity(LOWER(u.first_name), LOWER(search_query)),
      similarity(LOWER(u.last_name), LOWER(search_query)),
      similarity(LOWER(CONCAT(u.first_name, ' ', u.last_name)), LOWER(search_query))
    ) >= min_similarity
  ORDER BY similarity_score DESC, u.first_name ASC
  LIMIT search_limit;
END;
$$ LANGUAGE plpgsql;

-- Create GIN index for better performance with pg_trgm
CREATE INDEX IF NOT EXISTS users_name_trgm_idx 
ON users USING GIN ((LOWER(first_name || ' ' || last_name)) gin_trgm_ops);

-- Grant execute permissions to authenticated users (Supabase)
GRANT EXECUTE ON FUNCTION search_users_by_name TO authenticated;

-- Example usage:
-- SELECT * FROM search_users_by_name('jan kow', 10, 'client', 0.1);
-- SELECT * FROM search_users_by_name('kowalski', 5, 'client', 0.2); 