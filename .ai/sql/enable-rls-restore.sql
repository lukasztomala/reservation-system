-- Skrypt do przywracania Row Level Security dla tabeli users
-- Przywraca bezpieczną konfigurację produkcyjną

-- Sprawdzenie aktualnego stanu RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- Włączenie RLS dla tabeli users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Sprawdzenie czy RLS zostało włączone
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- Sprawdzenie istniejących polityk
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- Komunikat o stanie
SELECT 'RLS przywrócone dla tabeli public.users - bezpieczna konfiguracja aktywna' as status; 