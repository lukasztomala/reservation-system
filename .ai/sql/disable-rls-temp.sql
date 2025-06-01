-- Skrypt do tymczasowego wyłączenia Row Level Security dla tabeli users
-- Uwaga: To jest rozwiązanie deweloperskie - w produkcji używaj odpowiednich polityk RLS

-- Sprawdzenie aktualnego stanu RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- Wyłączenie RLS dla tabeli users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Sprawdzenie czy RLS zostało wyłączone
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- Komunikat o stanie
SELECT 'RLS wyłączone dla tabeli public.users - anon key może teraz czytać dane' as status; 