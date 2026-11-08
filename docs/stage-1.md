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
- Progi kontrastu WCAG 2.2 AA egzekwowane testem — patrz `packages/ui/src/contrast.test.ts`.

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
