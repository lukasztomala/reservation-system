# Dokument wymagań produktu (PRD) - System rezerwacji (MVP)

## 1. Przegląd produktu

System rezerwacji wizyt medycznych (akupunktura) umożliwiający klientom samodzielne umawianie i anulowanie wizyt oraz pracownikowi pełne zarządzanie kalendarzem. Aplikacja webowa responsywna (mobile-first) zbudowana w oparciu o React, Astro i Supabase. Zintegrowana z modułem AI rekomendującym nakłucia wg TCM.

## 2. Problem użytkownika

Manualne tworzenie i planowanie wizyt w notesie lub kalendarzu jest czasochłonne, podatne na błędy oraz utrudnia dostęp do historii danych pacjentów.

## 3. Wymagania funkcjonalne

1. rejestracja konta klienta i logowanie (imię, nazwisko, data urodzenia, email, nr telefonu)
2. tabelaryczny widok dostępnych terminów na miesiąc do przodu z kolumnami: data, godzina, imię i nazwisko klienta, typ wizyty, notatka klienta
3. rezerwacja wizyty przez klienta z możliwością dodania notatki
4. anulowanie wizyty przez klienta i pracownika
5. automatyczne blokowanie terminów zgodnie z czasem trwania wizyty (2h pierwsza, 1h kolejne)
6. historia wizyt w formie paginowanej listy (data, godzina, imię i nazwisko, notatka klienta, notatka pracownika)
7. zarządzanie kalendarzem przez pracownika: dodawanie/anulowanie wizyt, edycja godzin pracy i blokowanie terminów
8. dwie kategorie notatek: klienta (widoczne dla obu stron) i pracownika (widoczne tylko dla pracownika)
9. wyszukiwanie pacjentów po imieniu i nazwisku z tolerancją na literówki
10. generowanie rekomendacji AI nakłuć (opcje: na podstawie wszystkich notatek lub wybranej notatki), prezentowane jako kilka opcji na stronie
11. interfejs powiadomień o sukcesie lub błędzie każdej operacji
12. walidacja zapobiegająca konfliktom w rezerwacjach

## 4. Granice produktu

1. obsługa tylko jednego pracownika i jednej placówki
2. brak funkcji społecznościowych
3. brak wysyłania email/SMS (powiadomienia tylko w interfejsie/logach)
4. brak możliwości edycji danych klienta po rejestracji

## 5. Historyjki użytkowników

ID: US-004  
Tytuł: rezerwacja wizyty przez klienta  
Opis: jako zalogowany klient chcę wybrać termin wizyty z tabeli dostępnych terminów na miesiąc do przodu oraz dodać notatkę  
Kryteria akceptacji:

- tabela wyświetla wszystkie terminy na miesiąc do przodu z kolumnami: data, godzina, typ wizyty
- zajęte terminy są oznaczone i niedostępne do wyboru
- klient może wybrać wolny termin i dodać notatkę
- po rezerwacji termin zostaje zablokowany odpowiednio na 2h lub 1h

ID: US-005  
Tytuł: anulowanie wizyty przez klienta  
Opis: jako klient chcę anulować zarezerwowaną wizytę, aby zwolnić termin  
Kryteria akceptacji:

- klient może wybrać wizytę z historii i kliknąć anuluj
- klient musi podać notatkę z przyczyna rezygnacji
- po anulowaniu termin staje się dostępny
- wyświetlane jest potwierdzenie operacji lub komunikat o błędzie

ID: US-006  
Tytuł: przegląd historii wizyt przez klienta  
Opis: jako klient chcę przeglądać historię moich wizyt w formie paginowanej listy  
Kryteria akceptacji:

- lista zawiera datę, godzinę, imię i nazwisko, notatkę klienta, notatkę pracownika
- dostępna jest paginacja

ID: US-007  
Tytuł: dodanie wizyty przez pracownika  
Opis: jako pracownik chcę dodać wizytę dla klienta, aby ręcznie zaplanować wizytę  
Kryteria akceptacji:

- pracownik może wyszukać pacjenta i wybrać wolny termin z tabeli
- po dodaniu wizyty termin zostaje zablokowany
- wyświetlane jest potwierdzenie operacji

ID: US-008  
Tytuł: anulowanie wizyty przez pracownika  
Opis: jako pracownik chcę anulować wizytę klienta, aby zwolnić termin  
Kryteria akceptacji:

- pracownik może wybrać wizytę i kliknąć anuluj
- termin staje się dostępny
- wyświetlane jest potwierdzenie operacji

ID: US-009  
Tytuł: edycja notatki po wizycie przez pracownika  
Opis: jako pracownik chcę dodawać i edytować notatki do wizyty, aby dokumentować przebieg i zalecenia  
Kryteria akceptacji:

- pracownik może dodać nową notatkę po wizycie
- pracownik może edytować istniejącą notatkę
- zmiany są zapisywane i widoczne w historii wizyt

ID: US-010  
Tytuł: przegląd notatek pacjenta przez pracownika  
Opis: jako pracownik chcę przeglądać notatki wszystkich pacjentów, aby uzyskać kontekst przed wizytą  
Kryteria akceptacji:

- pracownik widzi listę notatek klientów w historii wizyt

ID: US-011  
Tytuł: modyfikacja godzin pracy i blokowanie terminów  
Opis: jako pracownik chcę zmieniać dostępne godziny pracy i blokować terminy (np. urlop), aby zarządzać kalendarzem  
Kryteria akceptacji:

- pracownik może ustawić nieaktywne przedziały czasowe
- zablokowane terminy są oznaczone jako niedostępne

ID: US-012  
Tytuł: wyszukiwanie pacjentów  
Opis: jako pracownik chcę wyszukiwać pacjentów po imieniu i nazwisku z tolerancją na literówki, aby szybko znaleźć profil  
Kryteria akceptacji:

- pole wyszukiwania sugeruje wyniki przy częściowym dopasowaniu
- wyniki zawierają podobne frazy nawet z literówkami

ID: US-013  
Tytuł: generowanie rekomendacji AI na podstawie wszystkich notatek  
Opis: jako pracownik chcę wygenerować rekomendacje nakłuć TCM na podstawie wszystkich notatek pacjenta  
Kryteria akceptacji:

- pracownik klika przycisk "rekomenduj z całej historii"
- system wyświetla kilka opcji nakłuć bezpośrednio na stronie

ID: US-014  
Tytuł: generowanie rekomendacji AI na podstawie wybranej notatki  
Opis: jako pracownik chcę wygenerować rekomendacje nakłuć TCM na podstawie konkretnej notatki pacjenta  
Kryteria akceptacji:

- pracownik wybiera notatkę i klika "rekomenduj z tej notatki"
- system wyświetla kilka opcji nakłuć bezpośrednio na stronie

ID: US-015  
Tytuł: interfejs powiadomień o sukcesie/błędzie operacji  
Opis: jako użytkownik chcę otrzymywać wyraźne komunikaty o powodzeniu lub błędzie każdej operacji, aby wiedzieć, czy moje działania zostały wykonane  
Kryteria akceptacji:

- po każdej akcji pojawia się komunikat o sukcesie lub błędzie
- komunikat wymaga potwierdzenia lub automatycznie znika

## 6. Metryki sukcesu

1. co najmniej 75% rezerwacji realizowanych przez aplikację (online booking ratio)
