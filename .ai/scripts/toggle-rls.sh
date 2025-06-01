#!/bin/bash

# Skrypt do zarządzania Row Level Security dla tabeli users
# Użycie: ./toggle-rls.sh [disable|enable|status]

DB_HOST="localhost"
DB_PORT="54322"
DB_USER="postgres"
DB_NAME="postgres"
export PGPASSWORD="postgres"

case "$1" in
  "disable")
    echo "🔓 Wyłączanie Row Level Security dla tabeli users..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f .ai/sql/disable-rls-temp.sql
    echo "✅ RLS wyłączone - endpoint /api/users/me powinien teraz działać"
    ;;
  
  "enable")
    echo "🔒 Włączanie Row Level Security dla tabeli users..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f .ai/sql/enable-rls-restore.sql
    echo "✅ RLS włączone - tabela users jest teraz zabezpieczona"
    ;;
  
  "status")
    echo "📊 Status Row Level Security dla tabeli users:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public';"
    ;;
  
  *)
    echo "🔧 Zarządzanie Row Level Security dla tabeli users"
    echo ""
    echo "Użycie: $0 [disable|enable|status]"
    echo ""
    echo "Polecenia:"
    echo "  disable  - Wyłącza RLS (dla developmentu)"
    echo "  enable   - Włącza RLS (dla produkcji)"
    echo "  status   - Sprawdza aktualny stan RLS"
    echo ""
    echo "Przykłady:"
    echo "  $0 disable  # Wyłącz RLS żeby /api/users/me działało"
    echo "  $0 enable   # Włącz RLS z powrotem"
    echo "  $0 status   # Sprawdź czy RLS jest włączone"
    ;;
esac 