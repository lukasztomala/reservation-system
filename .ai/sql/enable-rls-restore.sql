-- Skrypt do przywracania Row Level Security dla WSZYSTKICH tabel
-- Przywraca bezpieczną konfigurację produkcyjną
-- Włącza RLS dla wszystkich tabel w schemacie public

-- Sprawdzenie aktualnego stanu RLS dla wszystkich tabel
SELECT 'Sprawdzenie stanu RLS przed zmianami:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Włączenie RLS dla wszystkich tabel w schemacie public
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
        RAISE NOTICE 'RLS włączone dla tabeli: public.%', table_record.tablename;
    END LOOP;
END $$;

-- Sprawdzenie czy RLS zostało włączone dla wszystkich tabel
SELECT 'Sprawdzenie stanu RLS po zmianach:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Sprawdzenie istniejących polityk dla wszystkich tabel
SELECT 'Sprawdzenie istniejących polityk RLS:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Podsumowanie
SELECT 
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity = true THEN 1 END) as tables_with_rls,
    COUNT(CASE WHEN rowsecurity = false THEN 1 END) as tables_without_rls
FROM pg_tables 
WHERE schemaname = 'public';

-- Sprawdzenie czy wszystkie tabele mają włączone RLS
SELECT 
    CASE 
        WHEN COUNT(CASE WHEN rowsecurity = false THEN 1 END) = 0 
        THEN '✅ Wszystkie tabele mają włączone RLS'
        ELSE '❌ Niektóre tabele nadal mają wyłączone RLS'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public';

-- Komunikat o stanie
SELECT 'RLS przywrócone dla WSZYSTKICH tabel w schemacie public - bezpieczna konfiguracja aktywna' as status; 