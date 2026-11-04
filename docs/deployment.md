# Lista kontrolna przed uruchomieniem na własnym serwerze

Ten dokument opisuje, co trzeba zrobić **przed** pierwszym uruchomieniem i co
odróżnia środowisko developerskie od publicznego. Kolejność ma znaczenie:
każdy punkt zakłada, że poprzedni jest już zrobiony.

Zasada nadrzędna: jeżeli czegoś tu nie ma, a kod tego wymaga — to jest błąd
dokumentacji, a nie pole do domysłów. Dopisz ten punkt, nie zgaduj.

## 0. Wersje, które nie podlegają wyborowi

| Element | Wersja | Dlaczego |
| --- | --- | --- |
| Python | **3.12** | MediaPipe i TensorFlow nie mają wydania dla 3.13, a Aider wymaga wersji poniżej 3.13 |
| Node | **20** | taka wersja jest w CI |
| PostgreSQL | 16+ | `docker-compose.yml` używa `postgres:16-alpine` |
| Redis | 7+ | `docker-compose.yml` używa `redis:7-alpine` |

## 1. Sprawdzenie wstępne

Uruchom `scripts/preflight.sh`. Skrypt niczego nie zmienia i nie instaluje —
pyta o wersje narzędzi i czyta zmienne środowiskowe. Kod wyjścia `0` oznacza,
że można przejść dalej.

Pozycje krytyczne: `SECRET_KEY`, `FIELD_ENCRYPTION_KEY`, `DATABASE_URL`,
`REDIS_URL`, obecność `python3.12`, Node w wersji co najmniej 20.

## 2. Baza danych

```shell
python manage.py migrate
python manage.py createsuperuser
```

Migracje zakładają model docelowy. Nie ma przenoszenia danych z dawnych
systemów — baza startuje pusta i taka ma być na tym etapie.

## 3. Sekrety

- `SECRET_KEY` — wygeneruj raz: `python -c "import secrets; print(secrets.token_urlsafe(50))"`.
- `FIELD_ENCRYPTION_KEY` — wygeneruj raz i **zachowaj kopię**. Zmiana tej
  wartości czyni zapisane klucze dostawców nieczytelnymi. Odwrócenia nie ma.
- Klucze dostawców (OpenAI, Anthropic, GitHub, ElevenLabs i reszta) **nie
  należą do plików środowiska**. Użytkownik wpisuje je w ustawieniach aplikacji.

## 4. Uruchomienie usług

1. PostgreSQL i Redis — kontenery albo usługi systemowe.
2. Usługa API — serwer aplikacji i migracje.
3. Usługa czasu rzeczywistego — kanał WebSocket na Redisie.
4. Interfejs — z adresem API i adresem kanału czasu rzeczywistego.

## 5. Środowisko publiczne

Przy `ENVIRONMENT` innym niż `development`:

- `ALLOWED_HOSTS` musi wskazywać domenę, pod którą stoi aplikacja,
- `CSRF_TRUSTED_ORIGINS` musi używać `https://` — inaczej żądania zapisujące
  dostaną 403,
- ciasteczka sesji muszą być ustawione na `Secure` (ustawienie środowiska
  produkcyjnego); bez HTTPS przeglądarka ich nie przyjmie,
- kanał WebSocket wymaga tego samego pochodzenia co interfejs.

## 6. Czego nie da się tu zrobić i dlaczego

- **Generacji muzyki** — MusicGen średni potrzebuje karty graficznej z 16 GB
  pamięci. To osobna maszyna, nie część maszyny aplikacyjnej.
- **Rozpoznawania migów na darmowym planie** — model MediaPipe potrzebuje
  własnego środowiska i czasu procesora.
- **Powiadomień push** — kanał nie został wybrany: usługa zewnętrzna albo
  własna implementacja na kluczach VAPID. Do decyzji przed Etapem 2.
- **Feed, Studio, Chat, Create, Dev i Access** — to Etapy 2–5. Ekrany tych
  modułów mówią wprost, że powstają później, i nie udają działających funkcji.

## 7. Test dymny po uruchomieniu

1. `GET /v1/csrf` ustawia ciasteczko — bez tego żadne żądanie zapisujące nie przejdzie.
2. Rejestracja i logowanie zwracają tożsamość.
3. Pulpit pokazuje pasek tożsamości z nazwą użytkownika.
4. Ustawienia: zmiana motywu działa bez przeładowania; komunikat dla czytnika
   ekranu potwierdza zmianę.
5. Klucze: zapis klucza pokazuje wartość dokładnie raz i nigdy potem.
6. Ekran bez połączenia pokazuje stan kanału, a nie zmyśloną treść.
