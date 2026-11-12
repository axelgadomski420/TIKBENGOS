# PURRE PETS

<p align="center">
  <img src="https://ibb.co/N2D97SsC" alt="Logo PURRE PETS" width="260" />
</p>

<p align="center">
  <strong>Where exceptional breeds find exceptional homes.</strong><br />
  Platforma społecznościowa dla opiekunów, organizacji, ekspertów i osób szukających zwierzęcia z odpowiedzialnego źródła.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Angular-18.2-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.5" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot 3.5" />
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 17" />
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL 8" />
</p>

> **Status produktu:** repozytorium zawiera działające obszary odziedziczone po Elif oraz pierwsze elementy brandingu PURRE PETS. To nie jest jeszcze kompletna implementacja wszystkich funkcji z wizji produktu. W sekcji [Dostępne i planowane funkcje](#dostępne-i-planowane-funkcje) rozdzielamy istniejące moduły od planu rozwoju.

## Spis treści

- [Uruchomienie lokalne](#uruchomienie-lokalne)
- [Konfiguracja](#konfiguracja)
- [Dane demonstracyjne](#dane-demonstracyjne)
- [Testy i build](#testy-i-build)
- [Dostępne i planowane funkcje](#dostępne-i-planowane-funkcje)
- [Architektura i katalogi](#architektura-i-katalogi)
- [Wdrożenie](#wdrożenie)

## Uruchomienie lokalne

### Wymagania

- Node.js 20+ i npm
- Java 17
- MySQL 8+
- Git

### 1. Pobierz repozytorium

```bash
git clone https://github.com/axelgadomski420/TIKBENGOS.git
cd TIKBENGOS
```

### 2. Uruchom MySQL

Backend domyślnie łączy się z `localhost:3306`, bazą `Elif`, użytkownikiem `root` i pustym hasłem. Utwórz bazę, jeśli nie istnieje:

```sql
CREATE DATABASE IF NOT EXISTS Elif CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Jeśli lokalny MySQL wymaga hasła lub innego użytkownika, ustaw standardowe zmienne Spring Boot przed uruchomieniem backendu, np.:

```bash
export SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3306/Elif?createDatabaseIfNotExist=true'
export SPRING_DATASOURCE_USERNAME='root'
export SPRING_DATASOURCE_PASSWORD='twoje-lokalne-haslo'
```

Nie używaj pustego hasła ani domyślnego `root`-a w środowisku produkcyjnym.

### 3. Uruchom backend

W osobnym terminalu:

```bash
cd backend
./mvnw spring-boot:run
```

Windows PowerShell:

```powershell
cd backend
mvnw.cmd spring-boot:run
```

API działa pod `http://localhost:8087/elif`. Szybki test zdrowia:

```bash
curl http://localhost:8087/elif/api/health
```

### 4. Uruchom frontend

W kolejnym terminalu:

```bash
cd frontend
npm ci
npm start
```

Otwórz `http://localhost:4200`. Jeżeli repo nie ma zgodnego `package-lock.json`, użyj `npm install` zamiast `npm ci`.

Frontend korzysta z lokalnego API na porcie 8087. Aplikacja używa Angulara, Spring Boot i MySQL; nie trzeba uruchamiać alternatywnego stacka.

## Konfiguracja

Backend ładuje opcjonalne pliki `.env` z katalogu repozytorium lub `backend/`. Nie commituj sekretów. Najważniejsze zmienne integracyjne:

| Zmienna | Zastosowanie |
| --- | --- |
| `STRIPE_SECRET_KEY` | Płatności marketplace — wymagany klucz Stripe dla operacji płatniczych |
| `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | Wysyłka poczty SMTP |
| `APP_MAIL_FROM` | Adres nadawcy e-maili |
| `APP_FRONTEND_BASE_URL` | Linki do aplikacji w wiadomościach |
| `APP_BACKEND_BASE_URL` | Publiczny adres API używany m.in. w linkach |
| `GOOGLE_CLIENT_ID` | Logowanie Google po skonfigurowaniu zgodnego klienta OAuth |
| `OPENAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` | Integracje AI używane przez wybrane istniejące przepływy |
| `GIPHY_API_KEY` | Wyszukiwanie GIF-ów w komunikacji społecznościowej |
| `WEATHER_API_KEY` | Funkcje korzystające z danych pogodowych |
| `APP_NOTIFICATIONS_COMMUNITY_NEW_POST_ENABLED` | Powiadomienia o nowych postach w społeczności; domyślnie wyłączone |

Przykładowy lokalny `.env` (uzupełnij tylko integracje, których używasz):

```dotenv
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=
SPRING_MAIL_PASSWORD=
APP_MAIL_FROM=
APP_FRONTEND_BASE_URL=http://localhost:4200
APP_BACKEND_BASE_URL=http://localhost:8087/elif
STRIPE_SECRET_KEY=
GOOGLE_CLIENT_ID=
GIPHY_API_KEY=
```

Nie wklejaj prawdziwych tokenów do repozytorium ani zgłoszeń. Niektóre funkcje dostępne w UI wymagają zewnętrznych kluczy i usług.

## Dane demonstracyjne

Opcjonalne seedy SQL znajdują się w `backend/*_demo_seed.sql`. Uruchom je po skonfigurowaniu MySQL:

```bash
bash backend/run_demo_seeds.sh
```

Możesz nadpisać parametry seedowania:

```bash
DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=Elif DB_USER=root DB_PASSWORD='twoje-haslo' bash backend/run_demo_seeds.sh
```

Skrypt seedujący modyfikuje bazę. Uruchamiaj go wyłącznie na lokalnej/testowej instancji i upewnij się, że rozumiesz jego działanie przed użyciem.

Dane kont demonstracyjnych są opisane w `backend/user_demo_seed.sql`. Hasła z seedów są przeznaczone wyłącznie do lokalnych testów — nie używaj ich publicznie.

## Testy i build

### Frontend

```bash
cd frontend
npm run build
npm test -- --watch=false
```

### Backend

```bash
cd backend
./mvnw -DskipTests compile
./mvnw test
```

Windows PowerShell: użyj `mvnw.cmd` zamiast `./mvnw`.

## Dostępne i planowane funkcje

### Obszary już obecne w kodzie repozytorium

To istniejące moduły aplikacji bazowej. Ich zakres i kompletność różnią się; obecność modułu nie oznacza, że każdy przepływ jest gotowy do produkcji.

- **Konta i role:** rejestracja/logowanie, role użytkowników i administracyjne widoki.
- **Community:** grupy/społeczności, posty, komentarze, głosowanie, moderowanie oraz część realtime messaging/presence przez STOMP.
- **Adoption:** zwierzęta, schroniska/organizacje, wnioski, terminy i dokumenty związane z adopcją.
- **Pet Profiles:** profile zwierząt i narzędzia administracyjne.
- **Marketplace:** katalog, koszyk, zamówienia, Stripe i dokumenty rozliczeniowe — wymagają konfiguracji usług zewnętrznych.
- **Pet Transit:** kierunki i przepływy transportowe, checklisty oraz wybrane funkcje dokumentów/OCR.
- **Events:** wydarzenia, zapisy, listy oczekujących i przypomnienia w istniejących przepływach.
- **Services:** obszar wyszukiwania i zarządzania usługami.
- **Powiadomienia i e-mail:** zapis powiadomień, wybrane komunikaty realtime i e-maile przez SMTP.
- **Pierwszy etap PURRE PETS:** polskojęzyczny redesign strony głównej oraz istniejący panel ustawień języka i motywu. Nie oznacza to jeszcze pełnej lokalizacji każdego ekranu ani zapisu tych preferencji do konta po stronie backendu.

### Planowane — jeszcze nie należy zakładać, że działa

- pełna lokalizacja wszystkich widoków, walidacji, wiadomości i e-maili (PL domyślny; EN, DE, ES, FR, IT, UK; opcjonalnie RTL dla AR)
- zapisywanie preferencji języka/motywu w profilu użytkownika i synchronizacja między urządzeniami
- nowe przepływy marketplace dla odpowiedzialnych hodowli: mioty, profile hodowców, rodowody i rezerwacje
- PURRE Discover oraz HoloFeed z krótkimi filmami
- kompletne PURRE Messenger dla rozmów 1:1 i grupowych
- Pet Passport, Smart Match, Breed Explorer, Event Radar i PURRE Assistant
- pipeline weryfikacji hodowców, moderacja, wykrywanie nadużyć i ocena ryzyka z udziałem człowieka
- integracja Puter.js/Workers AI jako warstwa wspomagająca weryfikację; wyniki AI nie powinny zastępować decyzji człowieka
- storage S3/MinIO, Redis/cache/kolejki, produkcyjna konfiguracja obserwowalności i rate limiting
- dokumentacja prawna, pełne procesy RODO oraz audyt bezpieczeństwa

Zaawansowane szyfrowanie end-to-end, escrow i inne funkcje wymagające osobnego audytu nie należą do pierwszego MVP.

## Architektura i katalogi

```text
.
├── backend/       Spring Boot 3, Java 17, JPA, REST, STOMP, MySQL
├── frontend/      Angular 18, TypeScript, Tailwind CSS, Angular Material
├── scripts/       skrypty operacyjne i wdrożeniowe
├── design-system/ materiały i wytyczne interfejsu
└── README.md
```

Frontend ma moduły front-office (`frontend/src/app/front-office`), back-office (`frontend/src/app/back-office`), auth i shared. Backend jest aplikacją Spring Boot z domenami pod `backend/src/main/java/com/elif`.

| Warstwa | Technologia / szczegóły |
| --- | --- |
| UI | Angular 18.2, TypeScript, Tailwind CSS, Angular Material |
| API | Spring Boot 3.5, Java 17, REST i WebSocket/STOMP |
| Dane | MySQL 8, Spring Data JPA |
| Płatności | Stripe (wymaga klucza) |
| Powiadomienia | SMTP i wybrane zdarzenia realtime |
| Pliki | lokalny katalog uploadów `backend/uploads` |

API ma kontekst `/elif`, domyślnie na porcie 8087. WebSocket community korzysta z `/elif/ws-community`. Nie wystawiaj publicznie portów bazy danych ani usług wewnętrznych.

## Wdrożenie

Repo zawiera skrypt wdrożeniowy dla Ubuntu/Oracle Cloud:

```bash
curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/scripts/wdroz.sh -o /tmp/purre-deploy.sh
less /tmp/purre-deploy.sh  # przejrzyj skrypt przed uruchomieniem
bash /tmp/purre-deploy.sh
```

Skrypt używa Docker Compose, pobiera aktualną gałąź `main` i może zbudować/uruchomić usługi. Перед запуском проверьте `compose.yaml`/`docker-compose.yml`, `.env`, firewall и персистентность томов в своём окружении. Для продакшена:

- ustaw silne, unikalne sekrety i nie zapisuj ich w repozytorium;
- sprawdź reguły firewall — publiczne powinny być tylko potrzebne porty HTTP/HTTPS i SSH; MySQL nie powinien być dostępny z Internetu;
- skonfiguruj HTTPS, DNS, backup bazy i katalogu uploadów oraz monitoring;
- przetestuj migracje, odtworzenie backupu, logowanie i integracje na stagingu;
- nie uruchamiaj automatycznie skryptu wdrożeniowego bez wcześniejszego audytu jego treści i plików Compose.

Po wdrożeniu skrypt sprawdza `GET /elif/api/health` na porcie z konfiguracji `HTTP_PORT` (domyślnie 80). Szczegóły infrastruktury zależą od aktualnych plików Compose oraz ustawień konkretnej instancji.

## Dokumentacja uzupełniająca

- [Quick start Marketplace](MARKETPLACE_QUICK_START.md)
- [Implementacja Marketplace](MARKETPLACE_IMPLEMENTATION.md)
- [README frontendu](frontend/README.md)
- [Dokumentacja Community](frontend/src/app/front-office/community/README.md)
- [Design system](design-system/elif/MASTER.md)

---

PURRE PETS rozwija się na istniejącej architekturze Angular + Spring Boot + MySQL. Nazwy pakietów Java i część tras API nadal korzystają z `com.elif` oraz `/elif`; branding produktu nie zmienia automatycznie identyfikatorów backendu ani kontraktów API.
