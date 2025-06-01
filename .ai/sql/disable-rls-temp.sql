-- Skrypt do tymczasowego wyłączenia Row Level Security dla WSZYSTKICH tabel
-- Uwaga: To jest rozwiązanie deweloperskie - w produkcji używaj odpowiednich polityk RLS
-- NIGDY nie używaj tego na serwerze produkcyjnym!

-- Sprawdzenie aktualnego stanu RLS dla wszystkich tabel
SELECT 'Sprawdzenie stanu RLS przed zmianami:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Wyłączenie RLS dla wszystkich tabel w schemacie public
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_record.tablename);
        RAISE NOTICE 'RLS wyłączone dla tabeli: public.%', table_record.tablename;
    END LOOP;
END $$;

-- Sprawdzenie czy RLS zostało wyłączone dla wszystkich tabel
SELECT 'Sprawdzenie stanu RLS po zmianach:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Podsumowanie
SELECT 
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity = false THEN 1 END) as tables_without_rls,
    COUNT(CASE WHEN rowsecurity = true THEN 1 END) as tables_with_rls
FROM pg_tables 
WHERE schemaname = 'public';

-- Komunikat o stanie
SELECT 'RLS wyłączone dla WSZYSTKICH tabel w schemacie public - anon key może teraz czytać wszystkie dane' as status;
SELECT '⚠️  UWAGA: To jest niebezpieczne w środowisku produkcyjnym!' as warning; 