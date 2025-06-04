# Architektura UI dla Systemu Rezerwacji Wizyt Medycznych

## 1. Przegląd struktury UI

System składa się z dwóch oddzielnych interfejsów użytkownika dostosowanych do różnych ról:

- **Interfejs Klienta**: Uproszczony design z fokusem na booking wizyt i przeglądanie historii
- **Interfejs Pracownika**: Zaawansowany panel administracyjny z pełnym zarządzaniem kalendarzem, pacjentami i AI

Architektura oparta jest na mobile-first approach z responsywnym design'em używającym Astro 5 + React 19 + Tailwind 4 + Shadcn/ui.

## 2. Lista widoków

### 2.1. Widoki Klienta

#### `/login` - Strona logowania

- **Główny cel**: Uwierzytelnienie klienta w systemie
- **Kluczowe informacje**: Formularz logowania z email/hasło, link do rejestracji
- **Kluczowe komponenty**:
  - LoginForm z walidacją przy submit
  - Link przekierowujący do rejestracji
  - Toast notifications dla błędów logowania
- **UX/Dostępność**: ARIA labels, keyboard navigation, error handling
- **Bezpieczeństwo**: Client-side validation, CSRF protection przez Supabase Auth

#### `/register` - Strona rejestracji

- **Główny cel**: Rejestracja nowego klienta
- **Kluczowe informacje**: Formularz z imię, nazwisko, data urodzenia, email, telefon
- **Kluczowe komponenty**:
  - SingleStepRegistrationForm z walidacją przy submit
  - DatePicker dla daty urodzenia
  - Toast notifications dla potwierdzenia/błędów
- **UX/Dostępność**: Clear field labels, error messages, progress indication
- **Bezpieczeństwo**: Data validation, email verification przez Supabase

#### `/dashboard` - Dashboard klienta

- **Główny cel**: Główny hub dla aktywności klienta
- **Kluczowe informacje**: Nadchodzące wizyty, szybki dostęp do booking, historia wizyt (conditional)
- **Kluczowe komponenty**:
  - UpcomingAppointmentCard
  - QuickBookingButton
  - ConditionalHistorySection (tylko dla follow-up appointments)
- **UX/Dostępność**: Card-based layout, clear CTAs, mobile-optimized
- **Bezpieczeństwo**: User session validation, personal data protection

#### `/calendar` - Kalendarz dostępnych terminów

- **Główny cel**: Przeglądanie i rezerwacja dostępnych terminów
- **Kluczowe informacje**: Dzienny widok tabelaryczny, 5 dni do przodu, date picker
- **Kluczowe komponenty**:
  - DailyCalendarTable z appointment slots
  - DatePicker (otwarty zakres dat)
  - AppointmentTypeIndicator (Pierwsza/Kontrolna)
  - BookingModal
- **UX/Dostępność**: Clear availability indicators, keyboard navigation
- **Bezpieczeństwo**: Real-time availability check, conflict prevention

#### `/book/:timeSlot` - Rezerwacja wizyty

- **Główny cel**: Finalizacja rezerwacji wybranego terminu
- **Kluczowe informacje**: Szczegóły terminu, formularz notatki klienta, potwierdzenie
- **Kluczowe komponenty**:
  - AppointmentDetailsCard
  - ClientNoteForm
  - BookingConfirmationModal
  - ConflictModal (manual close required)
- **UX/Dostępność**: Clear booking summary, confirmation flow
- **Bezpieczeństwo**: Optimistic updates z rollback, double-booking prevention

#### `/history` - Historia wizyt

- **Główny cel**: Przeglądanie historii wizyt klienta
- **Kluczowe informacje**: Lista wizyt z datą, godziną, statusem, notatkami
- **Kluczowe komponenty**:
  - AppointmentHistoryTable z pagination
  - FilterPanel (nad tabelą)
  - SearchButton (explicit search)
  - AppointmentStatusBadge
- **UX/Dostępność**: Sortable columns, accessible pagination
- **Bezpieczeństwo**: Personal data access control

#### `/appointment/:id` - Szczegóły wizyty

- **Główny cel**: Wyświetlenie szczegółów konkretnej wizyty
- **Kluczowe informacje**: Informacje o wizycie, notatka klienta, notatka pracownika
- **Kluczowe komponenty**:
  - AppointmentDetailsHeader
  - ClientNoteSection (editable dla przyszłych wizyt)
  - StaffNoteSection (read-only)
  - CancelAppointmentButton
- **UX/Dostępność**: Clear information hierarchy, action buttons
- **Bezpieczeństwo**: Appointment ownership validation

### 2.2. Widoki Pracownika

#### `/staff/login` - Logowanie pracownika

- **Główny cel**: Uwierzytelnienie pracownika
- **Kluczowe informacje**: Formularz logowania, różne uprawnienia od klienta
- **Kluczowe komponenty**: StaffLoginForm, role-based routing
- **UX/Dostępność**: Professional interface, clear role indication
- **Bezpieczeństwo**: Enhanced authentication, role validation

#### `/staff/dashboard` - Dashboard pracownika

- **Główny cel**: Główny panel zarządzania dla pracownika
- **Kluczowe informacje**: Przegląd dzisiejszych wizyt, szybkie akcje, statystyki
- **Kluczowe komponenty**:
  - TodayAppointmentsOverview
  - QuickActionButtons
  - PatientSearchWidget
  - RecentPatientsCard
- **UX/Dostępność**: Information density balanced with usability
- **Bezpieczeństwo**: Staff-only data access, audit logging

#### `/staff/calendar` - Kalendarz zarządzania wizytami

- **Główny cel**: Zarządzanie wszystkimi wizytami w systemie
- **Kluczowe informacje**: Dzienny widok z wszystkimi wizytami, sloty, blokady
- **Kluczowe komponenty**:
  - StaffCalendarTable
  - AppointmentSlotManager
  - DatePicker z 5-dniowym zakresem
  - AddAppointmentButton
  - BlockTimeSlotButton
- **UX/Dostępność**: Dense information display, quick actions
- **Bezpieczeństwo**: Full calendar access control

#### `/staff/patients/search` - Wyszukiwanie pacjentów (header global)

- **Główny cel**: Globalny dostęp do wyszukiwania pacjentów
- **Kluczowe informacje**: Search input w header przekierowujący do dedicated page
- **Kluczowe komponenty**:
  - GlobalSearchInput (w header)
  - SearchRedirect functionality
- **UX/Dostępność**: Always accessible, keyboard shortcut
- **Bezpieczeństwo**: Fuzzy search z data protection

#### `/staff/patients/results` - Wyniki wyszukiwania pacjentów

- **Główny cel**: Wyświetlenie wyników wyszukiwania pacjentów
- **Kluczowe informacje**: Lista pacjentów z możliwością wyszukiwania po wszystkich danych
- **Kluczowe komponenty**:
  - AdvancedSearchForm (imię, nazwisko, email, telefon, data urodzenia)
  - PatientResultsList
  - QuickActionButtons (Dodaj wizytę, Zobacz historię, Zobacz profil)
  - SearchButton (explicit, nie real-time)
- **UX/Dostępność**: Comprehensive search options, clear results
- **Bezpieczeństwo**: Patient data access control, search logging

#### `/staff/patients/:id` - Profil pacjenta

- **Główny cel**: Kompleksowy widok danych pacjenta
- **Kluczowe informacje**: Dane osobowe, historia wizyt, wszystkie notatki
- **Kluczowe komponenty**:
  - PatientProfileHeader
  - PatientHistoryTable
  - AllNotesSection
  - AddAppointmentButton
  - AIRecommendationsTrigger
- **UX/Dostępność**: Comprehensive patient overview
- **Bezpieczeństwo**: Full patient data access for staff

#### `/staff/appointments/:id` - Szczegóły wizyty z notatkami

- **Główny cel**: Zarządzanie konkretną wizytą i dodawanie notatek
- **Kluczowe informacje**: Szczegóły wizyty, notatka klienta, formularz notatki pracownika
- **Kluczowe komponenty**:
  - AppointmentDetailsSection
  - ClientNoteDisplay (read-only)
  - StaffNoteForm (editable)
  - AIRecommendationsCollapsible
  - CopyRecommendationButtons
  - AppointmentActionsPanel
- **UX/Dostępność**: Single view workflow, AI integration
- **Bezpieczeństwo**: Note creation/editing permissions

#### `/staff/schedule` - Zarządzanie harmonogramem

- **Główny cel**: Ustawianie godzin pracy i blokowanie terminów
- **Kluczowe informacje**: Godziny pracy, zablokowane okresy, ustawienia kalendarza
- **Kluczowe komponenty**:
  - WorkingHoursEditor
  - TimeBlockingInterface
  - CalendarSettingsPanel
  - HolidayManager
- **UX/Dostępność**: Calendar management tools
- **Bezpieczeństwo**: Schedule modification permissions

### 2.3. Widoki wspólne

#### `/error` - Strona błędu

- **Główny cel**: Graceful handling błędów aplikacji
- **Kluczowe informacje**: User-friendly error message, opcje recovery
- **Kluczowe komponenty**: ErrorBoundary, RetryButton, BackButton
- **UX/Dostępność**: Clear error communication, recovery options
- **Bezpieczeństwa**: No sensitive information exposure

#### `/loading` - Stany ładowania

- **Główny cel**: Feedback podczas asynchronicznych operacji
- **Kluczowe informacje**: Loading indicators, progress feedback
- **Kluczowe komponenty**: LoadingSpinner, SkeletonLoader, ProgressIndicator
- **UX/Dostępność**: Clear loading states, timeout handling
- **Bezpieczeństwo**: Secure data loading

## 3. Mapa podróży użytkownika

### 3.1. Przepływ Klienta

**Nowy użytkownik:**
`/register` → Formularz rejestracji → Email verification → `/login` → Logowanie → `/dashboard` → Welcome tour

**Rezerwacja wizyty:**
`/dashboard` → "Zarezerwuj wizytę" → `/calendar` → Date picker → Wybór slotu → `/book/:timeSlot` → Notatka klienta → Potwierdzenie → Toast success → `/dashboard`

**Anulowanie wizyty:**
`/dashboard` lub `/history` → Wybór wizyty → `/appointment/:id` → "Anuluj wizytę" → Modal z przyczyną → Potwierdzenie → Toast success → Powrót

**Przeglądanie historii:**
`/dashboard` → "Historia wizyt" → `/history` → Filtry/wyszukiwanie → `/appointment/:id` → Szczegóły

### 3.2. Przepływ Pracownika

**Dzienne zarządzanie:**
`/staff/login` → `/staff/dashboard` → Przegląd dnia → `/staff/calendar` → Zarządzanie wizytami

**Wyszukiwanie pacjenta:**
Dowolna strona → Header search → Wpisanie frazy → `/staff/patients/results` → Advanced search → Lista wyników → Quick actions

**Dodawanie wizyty:**
`/staff/patients/results` → "Dodaj wizytę" → `/staff/calendar` → Wybór slotu → Wybór pacjenta → Potwierdzenie

**Zarządzanie notatkami:**
`/staff/patients/:id` → Historia wizyt → `/staff/appointments/:id` → Widok notatki klienta → Dodanie notatki pracownika → AI rekomendacje → Kopiowanie → Zapisanie

**Zarządzanie harmonogramem:**
`/staff/dashboard` → Sidebar "Harmonogram" → `/staff/schedule` → Ustawienia godzin → Blokowanie terminów → Zapisanie

## 4. Układ i struktura nawigacji

### 4.1. Nawigacja Klienta - Top Navigation

- **Layout**: Horizontalny header z prostym menu
- **Elementy**: Logo/Home, Kalendarz, Historia, Profil, Wyloguj
- **Responsywność**: Hamburger menu na mobile
- **Accessibility**: Skip links, keyboard navigation

### 4.2. Nawigacja Pracownika - Collapsible Sidebar

- **Layout**: Boczny panel z możliwością collapse (domyślnie collapsed)
- **Elementy główne**:
  - Dashboard
  - Kalendarz
  - Pacjenci (wyszukiwanie)
  - Harmonogram
  - Ustawienia
- **Header**: GlobalSearchInput, notifications, profil
- **Stan**: Bez localStorage, zawsze startuje collapsed
- **Responsywność**: Overlay na mobile, collapse na tablet

### 4.3. Breadcrumbs i Context Navigation

- **Klient**: Minimal breadcrumbs tylko dla deep navigation
- **Pracownik**: Full breadcrumbs dla complex workflows
- **Back buttons**: W szczegółowych widokach
- **Context switching**: Łatwe przejścia między powiązanymi widokami

## 5. Kluczowe komponenty

### 5.1. Layout Components

- **ClientLayout**: Top navigation, simple structure, mobile-optimized
- **StaffLayout**: Sidebar + header, complex navigation, data-dense interface
- **AuthLayout**: Minimal layout dla login/register pages

### 5.2. Calendar Components

- **DailyCalendarTable**: Tabelaryczny widok z appointment slots
- **AppointmentSlot**: Pojedynczy slot z availability status
- **DatePicker**: Selcja daty z otwartym zakresem
- **TimeSlotManager**: Zarządzanie czasami i blokowaniem

### 5.3. Form Components

- **RegistrationForm**: Single-step z wszystkimi polami
- **LoginForm**: Proste logowanie z validation
- **NoteForm**: Edycja notatek z rich text support
- **SearchForm**: Advanced search z multiple criteria

### 5.4. Data Display Components

- **AppointmentTable**: Responsive table z sorting i pagination
- **PatientCard**: Compact patient information display
- **NoteCard**: Display dla notatek z role-based visibility
- **HistoryList**: Paginated list z filtering

### 5.5. Interactive Components

- **ToastNotification**: 4-variant system (success, error, warning, info), 5-sekund duration
- **Modal**: Accessible dialogs z proper focus management
- **SearchInput**: Debounced input z autocomplete
- **FilterPanel**: Filtry nad tabelami
- **Pagination**: Standard pagination z page size options

### 5.6. AI Components

- **AIRecommendationsPanel**: Collapsible recommendations display
- **RecommendationCard**: Single recommendation z copy button
- **CopyToClipboard**: Copy functionality z toast confirmation
- **AIErrorDisplay**: Error state z retry option

### 5.7. Loading & Error Components

- **LoadingSpinner**: For short operations
- **SkeletonLoader**: For content loading
- **ErrorBoundary**: Comprehensive error handling
- **ErrorMessage**: User-friendly error display
- **RetryButton**: Action dla error recovery

### 5.8. Accessibility Components

- **SkipLinks**: For keyboard navigation
- **FocusManager**: For modal and complex interactions
- **ARIALabels**: For screen reader support
- **KeyboardShortcuts**: For power users

### 5.9. Security Components

- **ProtectedRoute**: Role-based access control
- **SessionGuard**: Session validation middleware
- **DataMask**: For sensitive information display
- **AuditLogger**: For action tracking
