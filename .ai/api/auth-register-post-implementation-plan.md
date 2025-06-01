# API Endpoint Implementation Plan: POST /auth/register

## 1. Przegląd punktu końcowego

Endpoint służy do rejestracji nowych kont klientów w systemie rezerwacji. Proces obejmuje utworzenie konta użytkownika w Supabase Auth, zapisanie profilu użytkownika w bazie danych oraz automatyczne zalogowanie z zwróceniem tokenów sesji. Wszystkie nowe konta otrzymują domyślnie rolę 'client'.

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/auth/register`
- **Content-Type**: application/json
- **Parametry**:
  - **Wymagane**:
    - `email` (string) - adres email, musi być unikalny
    - `password` (string) - hasło użytkownika
    - `first_name` (string) - imię
    - `last_name` (string) - nazwisko
    - `birth_date` (string) - data urodzenia w formacie YYYY-MM-DD
    - `phone` (string) - numer telefonu, musi być unikalny
  - **Opcjonalne**: Brak
- **Request Body**:

```json
{
  "email": "jan.kowalski@example.com",
  "password": "SecurePassword123!",
  "first_name": "Jan",
  "last_name": "Kowalski",
  "birth_date": "1990-05-15",
  "phone": "+48123456789"
}
```

## 3. Wykorzystywane typy

- **Input DTOs**:
  - `RegisterRequestDto` - walidacja danych wejściowych
- **Output DTOs**:
  - `AuthResponseDto` - odpowiedź z danymi użytkownika i sesją
  - `UserDto` - publiczne dane użytkownika
  - `SessionDto` - tokeny dostępu i odświeżania
- **Command Models**:
  - `CreateUserCommand` - logika biznesowa tworzenia użytkownika
- **Error DTOs**:
  - `ValidationErrorDto` - błędy walidacji pól
  - `ErrorDto` - ogólne błędy systemowe

## 4. Szczegóły odpowiedzi

**Sukces (201 Created):**

```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "jan.kowalski@example.com",
    "first_name": "Jan",
    "last_name": "Kowalski",
    "birth_date": "1990-05-15",
    "phone": "+48123456789",
    "role": "client",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1.MR5VBwKh4X8I2..."
  }
}
```

**Błędy:**

- **400 Bad Request**: Nieprawidłowe dane wejściowe, błędy walidacji
- **409 Conflict**: Email lub telefon już istnieje w systemie
- **500 Internal Server Error**: Błędy połączenia z bazą danych lub Supabase

## 5. Przepływ danych

1. **Walidacja wejścia**: Sprawdzenie danych przez schemat Zod
2. **Sprawdzenie unikalności**: Weryfikacja czy email i telefon nie istnieją w bazie
3. **Tworzenie konta w Supabase Auth**: Użycie `supabase.auth.signUp()`
4. **Zapisanie profilu**: Wstawienie danych do tabeli `users`
5. **Zwrócenie odpowiedzi**: Użytkownik + tokeny sesji

**Interakcje z zewnętrznymi usługami:**

- Supabase Auth - tworzenie konta użytkownika
- PostgreSQL - zapis profilu użytkownika w tabeli `users`

## 6. Względy bezpieczeństwa

- **Haszowanie haseł**: Automatyczne przez Supabase Auth
- **Walidacja danych**: Użycie Zod do sanityzacji i walidacji wszystkich pól
- **Ochrona przed duplikatami**: Sprawdzenie unikalności email/telefon przed utworzeniem konta
- **Rate limiting**: Rozważyć implementację ograniczenia liczby prób rejestracji na IP
- **Weryfikacja email**: Opcjonalna konfiguracja potwierdzenia email przez Supabase
- **Sanityzacja**: Automatyczne escapowanie danych przed zapisem do bazy

## 7. Obsługa błędów

| Kod | Scenariusz                   | Obsługa                                    |
| --- | ---------------------------- | ------------------------------------------ |
| 400 | Nieprawidłowy format email   | Walidacja Zod, zwrócenie szczegółów błędu  |
| 400 | Słabe hasło                  | Komunikat o wymaganiach dotyczących hasła  |
| 400 | Nieprawidłowa data urodzenia | Walidacja formatu YYYY-MM-DD i logiczności |
| 400 | Nieprawidłowy numer telefonu | Walidacja formatu telefonu                 |
| 409 | Email już istnieje           | Sprawdzenie w bazie przed rejestracją      |
| 409 | Telefon już istnieje         | Sprawdzenie w bazie przed rejestracją      |
| 500 | Błąd Supabase Auth           | Logowanie błędu, ogólny komunikat          |
| 500 | Błąd bazy danych             | Logowanie błędu, rollback transakcji       |

## 8. Rozważania dotyczące wydajności

- **Indexy bazy danych**: Wykorzystanie unique constraint na email i phone
- **Walidacja po stronie klienta**: Zmniejszenie niepotrzebnych zapytań
- **Transakcje**: Atomowe operacje dla tworzenia użytkownika i profilu
- **Connection pooling**: Efektywne zarządzanie połączeniami z bazą
- **Caching**: Opcjonalne cache dla sprawdzania unikalności (przy dużym ruchu)

## 9. Etapy wdrożenia

1. **Tworzenie schematu walidacji Zod**:

   - Definicja `RegisterRequestSchema` w pliku walidacji
   - Walidacja email, hasła, formatu daty, numeru telefonu

2. **Implementacja AuthService**:

   - Metoda `registerClient()` w `src/lib/services/auth.service.ts`
   - Logika sprawdzania unikalności email/telefon
   - Integracja z Supabase Auth

3. **Implementacja UserService**:

   - Metoda `createUserProfile()` w `src/lib/services/user.service.ts`
   - Operacje CRUD na tabeli users

4. **Utworzenie API route**:

   - Plik `src/pages/api/auth/register.ts`
   - Handler POST z `export const prerender = false`
   - Użycie supabase z `context.locals`

5. **Obsługa błędów**:

   - Implementacja mapowania błędów Supabase na kody HTTP
   - Logowanie błędów systemowych
   - Zwracanie przyjaznych komunikatów użytkownikowi
