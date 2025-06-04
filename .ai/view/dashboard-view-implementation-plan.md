# Plan implementacji widoku Dashboard Klienta

## 1. Przegląd

Dashboard klienta stanowi główny hub aktywności użytkownika w systemie rezerwacji wizyt medycznych. Widok umożliwia przegląd nadchodzących wizyt, szybki dostęp do rezerwacji nowej wizyty oraz warunkowy dostęp do historii wizyt (tylko dla pacjentów z nadchodzącymi wizytami follow-up). Implementacja oparta jest na mobile-first approach z card-based layout używającym Astro 5 + React 19 + Tailwind 4 + Shadcn/ui.

## 2. Routing widoku

**Ścieżka**: `/dashboard`
**Typ**: Protected route (wymaga uwierzytelnienia klienta)
**Layout**: ClientLayout z top navigation

## 3. Struktura komponentów

```
DashboardPage
├── WelcomeHeader
├── LoadingState (conditional)
├── ErrorState (conditional)
├── UpcomingAppointmentCard (conditional)
├── QuickBookingButton
└── ConditionalHistorySection (conditional)
    └── HistoryPreviewCard[] (multiple)
```

## 4. Szczegóły komponentów

### DashboardPage

- **Opis komponentu**: Główny kontener strony dashboard, zarządza stanem ładowania danych i renderuje odpowiednie komponenty w zależności od stanu aplikacji
- **Główne elementy**:
  - Container div z responsive padding
  - Grid layout dla komponentów
  - Error boundary dla obsługi błędów
- **Obsługiwane interakcje**:
  - Inicjalizacja ładowania danych przy mount
  - Refresh danych przy powrocie na stronę
  - Navigation do innych widoków
- **Obsługiwana walidacja**:
  - Sprawdzenie uwierzytelnienia użytkownika
  - Walidacja odpowiedzi API
  - Sprawdzenie uprawnień do danych
- **Typy**: `DashboardData`, `DashboardState`, `UserDto`
- **Propsy**: Brak (strona główna)

### WelcomeHeader

- **Opis komponentu**: Nagłówek z powitaniem użytkownika, wyświetla imię i nazwisko oraz aktualne informacje
- **Główne elementy**:
  - Heading z imieniem użytkownika
  - Subtitle z datą/czasem
  - User avatar (opcjonalnie)
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Sprawdzenie czy dane użytkownika są dostępne
- **Typy**: `UserDto`
- **Propsy**: `{ user: UserDto; className?: string }`

### UpcomingAppointmentCard

- **Opis komponentu**: Karta wyświetlająca szczegóły najbliższej zaplanowanej wizyty z możliwością szybkich akcji
- **Główne elementy**:
  - Card container z border i shadow
  - Appointment date/time display
  - Appointment type badge (Pierwsza/Kontrolna)
  - Quick action buttons (Zobacz szczegóły, Anuluj)
  - Empty state gdy brak wizyt
- **Obsługiwane interakcje**:
  - Klik w kartę → redirect do `/appointment/:id`
  - Klik "Anuluj" → modal anulowania
  - Klik "Zobacz szczegóły" → redirect do szczegółów
- **Obsługiwana walidacja**:
  - Sprawdzenie czy wizyta jest w przyszłości
  - Walidacja statusu wizyty (tylko booked)
  - Sprawdzenie uprawnień do anulowania
- **Typy**: `UpcomingAppointmentViewModel`, `AppointmentDto`
- **Propsy**: `{ appointment?: UpcomingAppointmentViewModel; onCancelClick: (id: string) => void; className?: string }`

### QuickBookingButton

- **Opis komponentu**: Główny CTA button do szybkiej rezerwacji nowej wizyty
- **Główne elementy**:
  - Large prominent button
  - Icon + text
  - Loading state indicator
- **Obsługiwane interakcje**:
  - Klik → redirect do `/calendar`
  - Hover states
  - Focus states dla keyboard navigation
- **Obsługiwana walidacja**: Sprawdzenie czy użytkownik może rezerwować (np. limit aktywnych wizyt)
- **Typy**: Brak specjalnych typów
- **Propsy**: `{ disabled?: boolean; loading?: boolean; onClick: () => void; className?: string }`

### ConditionalHistorySection

- **Opis komponentu**: Sekcja z podglądem historii wizyt, widoczna tylko gdy użytkownik ma nadchodzącą wizytę follow-up
- **Główne elementy**:
  - Section header z tytułem
  - Lista HistoryPreviewCard
  - "Zobacz więcej" link do pełnej historii
  - Empty state gdy brak historii
- **Obsługiwane interakcje**:
  - Klik w kartę historii → redirect do `/appointment/:id`
  - Klik "Zobacz więcej" → redirect do `/history`
- **Obsługiwana walidacja**:
  - Sprawdzenie czy użytkownik ma nadchodzącą wizytę follow-up
  - Walidacja uprawnień do historii
- **Typy**: `HistoryPreviewViewModel[]`, `ConditionalHistoryProps`
- **Propsy**: `{ shouldShow: boolean; historyItems: HistoryPreviewViewModel[]; onViewMore: () => void; className?: string }`

### HistoryPreviewCard

- **Opis komponentu**: Kompaktowa karta z podglądem pojedynczej wizyty z historii
- **Główne elementy**:
  - Compact card layout
  - Date/time display
  - Status badge
  - Truncated notes preview
- **Obsługiwane interakcje**:
  - Klik → redirect do szczegółów wizyty
  - Hover states
- **Obsługiwana walidacja**: Sprawdzenie dostępności danych wizyty
- **Typy**: `HistoryPreviewViewModel`
- **Propsy**: `{ appointment: HistoryPreviewViewModel; onClick: (id: string) => void; className?: string }`

### LoadingState

- **Opis komponentu**: Komponent stanu ładowania z skeleton loaderami
- **Główne elementy**:
  - Skeleton dla welcome header
  - Skeleton dla appointment card
  - Skeleton dla history section
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**: `{ className?: string }`

### ErrorState

- **Opis komponentu**: Komponent stanu błędu z opcjami recovery
- **Główne elementy**:
  - Error icon/illustration
  - Error message
  - Retry button
  - Support contact info
- **Obsługiwane interakcje**:
  - Klik "Spróbuj ponownie" → reload danych
  - Klik kontakt → mailto/redirect
- **Obsługiwana walidacja**: Brak
- **Typy**: `ErrorStateProps`
- **Propsy**: `{ error: Error; onRetry: () => void; className?: string }`

## 5. Typy

```typescript
// ViewModels dla Dashboard
export interface DashboardData {
  user: UserDto;
  upcomingAppointment?: UpcomingAppointmentViewModel;
  recentHistory: HistoryPreviewViewModel[];
  hasFollowUpAppointment: boolean;
}

export interface UpcomingAppointmentViewModel {
  id: string;
  startTime: string; // ISO8601
  endTime: string; // ISO8601
  appointmentType: "first_visit" | "follow_up";
  canCancel: boolean;
  timeUntil: string; // "za 2 dni", "jutro o 10:00"
  status: AppointmentStatus;
  staffName?: string;
}

export interface HistoryPreviewViewModel {
  id: string;
  date: string; // formatted date
  time: string; // formatted time
  appointmentType: "first_visit" | "follow_up";
  status: AppointmentStatus;
  hasClientNote: boolean;
  hasStaffNote: boolean;
  notesPreview?: string; // truncated notes content
}

export interface ConditionalHistoryProps {
  shouldShow: boolean;
  historyItems: HistoryPreviewViewModel[];
  onViewMore: () => void;
  className?: string;
}

export interface DashboardState {
  loading: boolean;
  error: Error | null;
  data: DashboardData | null;
  refreshing: boolean;
}

export interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  className?: string;
}
```

## 6. Zarządzanie stanem

**Custom Hook**: `useDashboardData()`

```typescript
interface UseDashboardData {
  state: DashboardState;
  refresh: () => Promise<void>;
  cancelAppointment: (appointmentId: string, reason: string) => Promise<void>;
}
```

**Funkcjonalność hook'a**:

- Automatyczne ładowanie danych przy mount
- Cache management z automatycznym invalidation
- Error handling z retry mechanism
- Loading states dla różnych operacji
- Optimistic updates dla akcji użytkownika

**Stan lokalny**:

- Loading/Error/Success states
- Cache dla danych dashboard
- Refresh timestamp dla staleness check

## 7. Integracja API

**Endpointy używane**:

1. **GET /users/me**

   - **Typ żądania**: Brak body
   - **Typ odpowiedzi**: `UserDto`
   - **Cel**: Pobranie danych aktualnego użytkownika

2. **GET /appointments**

   - **Typ żądania**: `AppointmentListRequestDto` (query params)
   - **Parametry**: `client_id=current_user_id&status=booked&start_date=today&sort=start_time&order=asc&limit=1`
   - **Typ odpowiedzi**: `AppointmentListResponseDto`
   - **Cel**: Pobranie najbliższej nadchodzącej wizyty

3. **GET /appointments** (dla historii)
   - **Typ żądania**: `AppointmentListRequestDto` (query params)
   - **Parametry**: `client_id=current_user_id&sort=start_time&order=desc&limit=3`
   - **Typ odpowiedzi**: `AppointmentListResponseDto`
   - **Cel**: Pobranie ostatnich wizyt dla preview historii

**Transformacja danych**:

- Mapowanie `AppointmentDto` → `UpcomingAppointmentViewModel`
- Mapowanie `AppointmentDto[]` → `HistoryPreviewViewModel[]`
- Kalkulacja `timeUntil` dla nadchodzącej wizyty
- Formatowanie dat i czasów
- Determinacja `hasFollowUpAppointment` flag

## 8. Interakcje użytkownika

1. **Wejście na dashboard**:

   - Trigger: Nawigacja do `/dashboard`
   - Akcja: Automatyczne ładowanie danych przez `useDashboardData`
   - Rezultat: Wyświetlenie dashboard z aktualnymi danymi

2. **Klik "Zarezerwuj wizytę"**:

   - Trigger: Klik QuickBookingButton
   - Akcja: `router.push('/calendar')`
   - Rezultat: Przekierowanie do widoku kalendarza

3. **Klik w kartę nadchodzącej wizyty**:

   - Trigger: Klik UpcomingAppointmentCard
   - Akcja: `router.push('/appointment/:id')`
   - Rezultat: Przekierowanie do szczegółów wizyty

4. **Anulowanie wizyty**:

   - Trigger: Klik "Anuluj" w UpcomingAppointmentCard
   - Akcja: Otwarcie modal anulowania → API call → refresh danych
   - Rezultat: Toast confirmation + zaktualizowany dashboard

5. **Przegląd historii**:

   - Trigger: Klik karta historii lub "Zobacz więcej"
   - Akcja: `router.push('/history')` lub `router.push('/appointment/:id')`
   - Rezultat: Przekierowanie do odpowiedniego widoku

6. **Retry po błędzie**:
   - Trigger: Klik "Spróbuj ponownie" w ErrorState
   - Akcja: `refresh()` function call
   - Rezultat: Ponowne ładowanie danych dashboard

## 9. Warunki i walidacja

**Warunki renderowania**:

1. **UpcomingAppointmentCard**: Renderowana tylko gdy `upcomingAppointment` istnieje i ma status `booked`
2. **ConditionalHistorySection**: Renderowana tylko gdy `hasFollowUpAppointment === true`
3. **LoadingState**: Renderowany gdy `loading === true`
4. **ErrorState**: Renderowany gdy `error !== null`

**Walidacja danych**:

1. **User authentication**: Middleware sprawdza czy użytkownik jest zalogowany
2. **Appointment ownership**: API automatycznie filtruje wizyty po `client_id`
3. **Date validation**: Sprawdzenie czy wizyty są w przyszłości/przeszłości
4. **Status validation**: Tylko wizyty ze statusem `booked` jako upcoming

**Walidacja uprawnień**:

1. **Cancel permission**: Sprawdzenie czy wizyta może być anulowana (np. nie za blisko terminu)
2. **History access**: Walidacja czy użytkownik ma prawo do historii (follow-up appointment)

## 10. Obsługa błędów

**Scenariusze błędów**:

1. **Network/API errors**:

   - **Obsługa**: ErrorBoundary + ErrorState component
   - **Recovery**: Retry button z exponential backoff
   - **User feedback**: Toast notification z opisem błędu

2. **Authentication errors (401)**:

   - **Obsługa**: Automatyczne przekierowanie do `/login`
   - **Recovery**: Re-authentication flow
   - **User feedback**: Toast "Sesja wygasła, zaloguj się ponownie"

3. **Authorization errors (403)**:

   - **Obsługa**: ErrorState z komunikatem o braku uprawnień
   - **Recovery**: Contact support option
   - **User feedback**: Clear error message

4. **Data loading errors**:

   - **Obsługa**: Partial loading - pokazanie dostępnych danych
   - **Recovery**: Selective retry dla failed requests
   - **User feedback**: Inline error messages dla specific sections

5. **Stale data handling**:
   - **Obsługa**: Background refresh z cache fallback
   - **Recovery**: Manual refresh option
   - **User feedback**: Subtle refresh indicator

**Error boundaries**:

- Page-level boundary dla krytycznych błędów
- Component-level boundary dla isolated failures
- Graceful degradation dla non-critical features

## 11. Kroki implementacji

1. **Przygotowanie typów i interfejsów**

   - Zdefiniowanie `ViewModel` types
   - Utworzenie `DashboardState` interface
   - Setup `ErrorStateProps` i innych prop types

2. **Implementacja custom hook `useDashboardData`**

   - Logika ładowania danych z API
   - Error handling i retry mechanism
   - Cache management
   - Data transformation logic

3. **Implementacja komponentów podstawowych**

   - `LoadingState` z skeleton loaders
   - `ErrorState` z retry functionality
   - `WelcomeHeader` z user display

4. **Implementacja komponentów głównych**

   - `UpcomingAppointmentCard` z interakcjami
   - `QuickBookingButton` z navigation
   - `HistoryPreviewCard` z kompaktowym layoutem

5. **Implementacja logiki warunkowej**

   - `ConditionalHistorySection` z conditional rendering
   - Logic dla `hasFollowUpAppointment` determination

6. **Implementacja głównego kontenera**

   - `DashboardPage` z state management
   - Integration wszystkich komponentów
   - Error boundary setup

7. **Implementacja nawigacji i routing**

   - Route protection middleware
   - Navigation handlers
   - URL state management

8. **Styling i responsywność**

   - Mobile-first responsive design
   - Tailwind utilities application
   - Shadcn/ui components integration

9. **Testing i optymalizacja**

   - Unit tests dla komponentów
   - Integration tests dla hook'ów
   - Performance optimization
   - Accessibility testing

10. **Error handling i edge cases**
    - Comprehensive error scenarios testing
    - Edge cases handling
    - Fallback mechanisms
    - User feedback optimization
