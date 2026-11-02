# Etap 1 — co jest zrobione, a co nie

Dokument prawdy o stanie prac. Zasada: nie dopisuj tu niczego, czego nie ma w kodzie.

## Zrobione

### Monorepo i struktura
- Katalogi wszystkich pakietów i usług założone tak, jak w planie architektury.
- `packages/core` — typy domeny i kontrakty API w TypeScript, jedno źródło prawdy
  dla całego interfejsu: tożsamość, role, feed, muzyka, czat, projekty, dostępność,
  tłumaczenia, zadania asynchroniczne.
- `packages/i18n` — w tej chwili to tylko `.gitkeep`, a nie gotowy moduł lokalizacji.
- `infra/` — `docker-compose.yml` i `.env.example` dla PostgreSQL, Redis, API, WebSocket.
- CI/CD — `.github/workflows/ci.yml` uruchamia lint, kontrolę typów, testy i audyt zależności.

### Design system BENGOS (`packages/ui`)
- Komplet tokenów nazwanych w briefie: `bengos-surface`, `bengos-accent`, `bengos-glow`,
  `bengos-motion-fast`, `bengos-motion-smooth`, `bengos-radius-card`, `bengos-focus-ring`.
- Ciemny motyw domyślny, pełny jasny motyw, motyw o wysokim kontraście,
  oraz tokeny trybu dostępności (większa typografia, uproszczone powierzchnie).
- `prefers-reduced-motion` respektowane na poziomie tokenów ruchu: przy włączonym
  ograniczeniu animacje schodzą do 1 ms, bez wyłączania funkcji.
- Progi kontrastu WCAG 2.2 AA egzekwowane testem — patrz `packages/ui/colors.test.ts`.

### Interfejs (`apps/web`)
- BENGOS Home: wyszukiwarka uniwersalna („zapytaj, stwórz, znajdź, zakoduj”),
  pasek tożsamości, karta „Stwórz teraz”, karta „Kontynuuj”, karta „Dla Ciebie”,
  karta dostępności, dolna nawigacja na pięć miejsc docelowych.
- Ekran ustawień z sekcjami: język, wygląd, dostępność, klucze API, prywatność.
- Ekran kluczy API: pole klucza pokazywane raz, bez możliwości odczytania z powrotem,
  z opisem, gdzie klucz jest używany.
- Offline: manifest PWA, service worker, ekran bez połączenia.

### API (`services/api`)
- Django 5 + django-ninja, jedno API z prefiksami na domeny.
- Autoryzacja sesyjna i tokenowa, rejestracja, logowanie, wylogowanie.
- Jedno konto i jeden model uprawnień z rolami: użytkownik, twórca, moderator,
  deweloper, administrator.
- Model kluczy API: szyfrowanie w spoczynku, jednorazowe pokazanie, brak odczytu zwrotnego.

## Nie zrobione — i tak ma być

- **Feed, Studio, Chat, Create, Dev, Access nie istnieją w tym etapie.** Nawigacja
  prowadzi do ekranów, które mówią wprost, że moduł jest w kolejnym etapie. To jest
  celowe: lepszy uczciwy ekran zastępczy niż atrapa działającej funkcji.
- **Wideo, muzyka, czat i migi nie mają jeszcze żadnej logiki.** Warstwy usług są
  założone jako katalogi z kontraktem API, nie jako działające procesy.
- **Push notifications nie są wybrane.** Do decyzji: usługa zewnętrzna czy własna
  implementacja na kluczach VAPID. Wpływa na Etap 2, bo PWA potrzebuje tego od początku.
- **Transkodowanie wideo nie istnieje.** Kolejka zadań jest w kontrakcie, nie w kodzie.
- **Nie ma jeszcze migracji danych z TIKTAK.** Baza startuje pusta, z modelem docelowym.

## Zadania otwarte z audytu, nierozwiązane w tym etapie

1. Liczba kont w darmowej dzierżawie Oracle — dokumentacja podaje limit i warunek
   wysokiego wykorzystania; konkretnej liczby nie potwierdzono. Plan ostrożnościowy:
   jedna maszyna ARM 4 rdzenie / 24 GB, wszystko w kontenerach.
2. Licencja `TIKMIG` — brak pliku licencji. Do uzupełnienia przed publicznym wydaniem.
3. Licencja `TIKMESS` — niepotwierdzona. Patrz `docs/licensing.md`.
4. Zakres migracji mediów z Cloudinary — bez dostępu do konta Cloudinary nie da się
   powiedzieć, ile plików trzeba przenieść.

## Czego ten etap świadomie nie obiecuje

- Pełnego tłumaczenia polskiego języka migowego. Model przenoszony z `TIKMIG`
  rozpoznaje 250 znaków amerykańskiego języka migowego i nie ma segmentacji
  ciągłego migania. Interfejs musi to mówić wprost.
- Generacji muzyki na darmowym planie Oracle. MusicGen średni potrzebuje 16 GB
  pamięci karty graficznej. To osobny worker, nie część maszyny aplikacyjnej.

