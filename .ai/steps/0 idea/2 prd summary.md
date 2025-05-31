<conversation_summary>
<decisions>
1. System rezerwacji będzie umożliwiał wybór terminu i anulowanie wizyt.
2. Terminy będą dostępne na miesiąc do przodu.
3. Dane klientów będą obejmować: imię, nazwisko, datę urodzenia, email, nr telefonu.
4. System AI będzie generować rekomendacje nakłucia TCM na podstawie wszystkich notatek lub konkretnej wskazanej notatki.
5. Wizyty będą mieć różne długości: pierwsza 2h, kolejne 1h.
6. Klienci będą mogli zostawiać notatki przy rezerwacji.
7. Klienci będą mieć dostęp do historii swoich wizyt.
8. Pracownik będzie mógł: dodawać/anulować wizyty, dodawać/edytować notatki, przeglądać notatki wszystkich pacjentów.
9. System nie będzie wysyłał powiadomień email/SMS, tylko zapisywał logi.
10. Terminy będą wyświetlane w formie tabeli z oznaczeniem zajętych.
11. Klienci nie będą mogli edytować swoich danych profilowych po rejestracji.
12. Historia wizyt będzie wyświetlana jako prosta lista z paginacją.
13. System uniemożliwi wprowadzenie wizyty dla zajętego terminu.
14. Wyszukiwanie pacjentów będzie działać po niepełnym imieniu/nazwisku z tolerancją na literówki.
15. Notatki pracownika będą widoczne tylko dla pracownika, ale pracownik może widzieć notatki klienta.
16. Format daty: RRRR-MM-DD GG:MM.
17. System będzie zawsze wyświetlać potwierdzenie operacji lub komunikat o błędzie.
18. Rekomendacje AI będą prezentowane bezpośrednio na stronie jako kilka opcji.
19. Pracownik będzie mógł modyfikować godziny pracy.
</decisions>

<matched_recommendations>
1. Zaprojektowanie tabelarycznego widoku terminów z oznaczeniem zajętych i wolnych, zawierającego datę, godzinę, dane klienta i typ wizyty.
2. Implementacja dwóch typów notatek: klienta (widoczne dla obu stron) i pracownika (widoczne tylko dla pracownika).
3. Automatyczne blokowanie terminów na odpowiedni czas (2h/1h) w zależności od rodzaju wizyty.
4. Funkcjonalność filtrowania wizyt po danych pacjenta.
5. Implementacja modyfikacji godzin pracy przez pracownika.
6. Stworzenie paginowanej historii wizyt z kluczowymi informacjami.
7. Zaprojektowanie interfejsu AI generującego rekomendacje nakłuć TCM z dwoma ścieżkami (wszystkie/wskazana notatka).
8. System powiadomień interfejsowych o sukcesie/błędzie operacji.
9. Walidacja zapobiegająca konfliktom w rezerwacjach.
10. Responsywny interfejs z podejściem mobile-first (React, Astro, Supabase).
</matched_recommendations>

<prd_planning_summary>
Planowany MVP systemu rezerwacji to aplikacja webowa (responsywna, mobile-first) mająca rozwiązać problem manualnego zarządzania wizytami. System będzie zbudowany w oparciu o React, Astro i Supabase.

**Funkcje główne:**
- Rezerwacja wizyt przez klienta z widokiem tabelarycznym terminów na miesiąc do przodu
- Anulowanie wizyt przez klienta i pracownika
- System kont dla klientów (imię, nazwisko, data urodzenia, email, telefon) 
- Dostęp do historii wizyt dla klientów
- Panel pracownika z możliwością zarządzania wizytami, dodawania notatek i blokowania terminów
- Integracja z AI do rekomendowania nakłuć akupunktury na podstawie historii wizyt pacjenta

**Ścieżki użytkownika:**
1. Klient: 
   - Rejestracja konta (bez możliwości późniejszej edycji danych)
   - Wybór terminu wizyty z tabelarycznego widoku
   - Dodanie notatki do wizyty
   - Przeglądanie historii wizyt
   - Anulowanie zaplanowanej wizyty

2. Pracownik:
   - Zarządzanie terminami (dodawanie/anulowanie wizyt)
   - Dodawanie/edycja notatek po wizycie
   - Przeglądanie historii wszystkich pacjentów z możliwością wyszukiwania
   - Generowanie rekomendacji AI dla nakłuć TCM (dwie opcje: wszystkie notatki / wskazana notatka)
   - Modyfikacja godzin pracy

**Kryteria sukcesu:**
- 75% rezerwacji dokonywanych przez aplikację (mierzone jako stosunek rezerwacji online do wszystkich rezerwacji)
- Automatyczne rozróżnianie pierwszej wizyty (2h) od kolejnych (1h)
- Skuteczne zapobieganie konfliktom w rezerwacjach

**Rozwiązania techniczne:**
- Tabelaryczny widok terminów z oznaczeniem dostępności
- Mechanizm dwóch typów notatek (klienta i pracownika) z odpowiednimi uprawnieniami
- System powiadomień interfejsowych o sukcesie/błędzie operacji
- Proste listy paginowane dla historii wizyt
- Wyszukiwanie tolerujące literówki i niepełne dane
- Interfejs AI prezentujący kilka rekomendacji nakłuć bezpośrednio na stronie
</prd_planning_summary>

<unresolved_issues>
1. Dokładna liczba klientów korzystających z systemu nie została określona.
2. Szczegółowe wymagania dotyczące bezpieczeństwa poza podstawowym uwierzytelnianiem.
3. Dokładny sposób działania systemu AI i format danych wejściowych/wyjściowych dla rekomendacji nakłuć.
4. Sposób rozróżniania przez system pierwszej wizyty od kolejnych.
5. Dokładny format i zawartość logów systemowych zastępujących powiadomienia.
</unresolved_issues>
</conversation_summary>
