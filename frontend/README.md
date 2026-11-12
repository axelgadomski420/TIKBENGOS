# PURRE PETS — frontend

Ta aplikacja jest zbudowana na Angular 18. Zawiera moduły odziedziczone po Elif oraz pierwsze elementy marki PURRE PETS. Szczegółowy status funkcji i uruchamianie całego stosu opisuje [główny README](../README.md).

## Wymagania

- Node.js 20+
- npm
- MySQL i backend Spring Boot, jeśli testujesz widoki pobierające dane z API

## Uruchomienie lokalne

```bash
cd frontend
npm install
npm start
```

Aplikacja będzie dostępna pod adresem <http://localhost:4200>. Lokalny frontend oczekuje API pod `http://localhost:8087/elif`; instrukcja startu backendu i MySQL znajduje się w głównym README.

## Polecenia

```bash
npm start                 # serwer developerski Angular
npm run build              # build produkcyjny
npm run watch              # build developerski z obserwowaniem zmian
npm test -- --watch=false  # testy jednostkowe, jednorazowo
```

## Moduły frontendu

- `src/app/auth` — logowanie, rejestracja i guardy
- `src/app/front-office` — landing, community, adoption, events, transit, marketplace, profile zwierząt i usługi
- `src/app/back-office` — panel administracyjny
- `src/app/shared` — współdzielone komponenty Angular
- `src/assets/i18n` — słowniki językowe
- `src/app/shared/purre-preferences` — serwisy preferencji języka/motywu i UI ustawień
- `src/purre-premium.css`, `src/purre-design-system.css` — tokeny i wspólne style PURRE

## Preferencje PURRE

- Polski jest domyślnym językiem dokumentu; wybór locale zapisywany jest w `localStorage`.
- Motywy: PURRE AURA, LIGHT, MIDNIGHT, FOREST, ROYAL, SUNSET, MONO i HIGH CONTRAST; dostępna jest również opcja zgodności z motywem systemowym.
- Słowniki pobierane są z `assets/i18n/<locale>.json`. Konfiguracja Angular kopiuje `src/assets` do katalogu wynikowego.
- Obecnie ustawienia są lokalne dla przeglądarki. Synchronizacja z profilem konta wymaga implementacji kontraktu API i nie jest opisywana jako gotowa.
- Nowe style buduj na tokenach `--purre-*` i klasach `.purre-*`.

## Status funkcji

W repozytorium znajdują się moduły auth/kont, community, adoption, profili zwierząt, marketplace, pet transit, events, services i narzędzia administracyjne. Dostępność poszczególnych przepływów zależy m.in. od MySQL, SMTP, Stripe i kluczy usług zewnętrznych.

Plan rozwoju, a nie deklaracja gotowej funkcjonalności: weryfikacja hodowców i Trust Score, marketplace miotów/rodowodów, HoloFeed, pełny PURRE Messenger, Smart Match, Pet Passport oraz AI-assisted verification.

## Testowanie

```bash
npm test -- --watch=false
npm run build
```
