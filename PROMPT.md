# BENGOS — prompt dla następnego bota

Zbuduj aplikację od zera. W tym repozytorium nie ma już kodu, jest tylko ten plik i znak `brand/logo.jpg`. Nie doklejaj niczego do starego układu. Stary kod był zły, bo nakładał na siebie kilka menu, wypalał napisy w grafice i dokładał martwe ekrany.

Właściciel mówi po polsku. Interfejs jest po polsku. Domena: `https://bengos.pl`. Repo: `https://github.com/axelgadomski420/TIKBENGOS`.

## Ekran startowy — to jest cały produkt na pierwszej klatce

Tło czarne. Na środku JEDEN obraz: `brand/logo.jpg`. To tygrys w szklanej kuli, nad nim świecący napis BENGOS. Obraz nie ma podpisów modułów. Nie dorabiaj drugiego tygrysa, zasłony startowej ani napisu BENGOS obok kuli.

Z kuli wychodzą cienkie linie i prawdziwe odnośniki HTML. Napis jest tekstem, nie fragmentem JPEG. Kliknięcie w słowo wchodzi w moduł. Słowa są czytelne bez najechania, małe, cyjan, lowercase, z odstępem między literami. Na hover i focus linia i słowo się zapalają.

Kolejność i kąty (0° = prawo, zgodnie ze wskazówkami zegara, środek kuli):

| słowo | kąt | adres |
| --- | ---: | --- |
| profil | 10° | `/profile` |
| wyszukiwarka | 52° | `/szukaj` |
| bengtok | 92° | `/feed` |
| asystent | 142° | `/create` |
| chat | 188° | `/chat` |
| ustawienia | 228° | `/settings` |
| studio | 262° | `/studio` |
| bridge | 298° | `/access` |
| dev | 334° | `/dev` |

Promień napisów większy niż kula, żeby słowa nie wchodziły na szkło. Pozycje trzymaj w zwykłym CSS (`transform` + zmienna kąta), nie w klasach, które build może wyrzucić. Długie słowo `wyszukiwarka` ma ciaśniejszy tracking, żeby nie ucięło go na telefonie. Cel dotykowy co najmniej 44 px.

W rogu, małym pismem, tylko „Konto” → `/login`. Nic więcej na starcie: żadnych kart, banerów, siatki kafli, stopki, dolnego paska.

## Reszta aplikacji

Po wejściu w moduł jeden pasek: małe logo wraca na start, obok nazwa miejsca. Drugiego menu nie ma. Nie ma dolnej nawigacji. Nie ma listy wszystkich modułów w nagłówku.

Kolory: czerń, biały tekst, cyjan `#7ef6ff` tylko jako akcent. Dużo światła, mało ramek. Żadnych checklist wdrożenia, zrzutów ról, sekcji „to będzie w etapie 2”, placeholderów „wkrótce” ani niebieskiego telefonu w środku strony.

`/login` to jeden ekran. Nad tygrysem przycisk „logowanie”, pod nim „rejestracja”. Oba przełączają formularz na tym samym adresie. Zalogowany wraca na `/`.

## Moduły, które mają działać, nie udawać

- **chat (BengMess).** Rozmowa 1:1 i grupa. Tekst, głos, obraz, plik, gloss języka migowego, Morse i tłumaczenie idą jedną kopertą. Szyfr na urządzeniu: ECDH P-256, preklucze, HKDF-SHA-256, AES-256-GCM, tajemnica w przód. Serwer trzyma kopertę, nie treść. Wiadomość może zniknąć po odczycie. Nie pisz, że jest lepszy od WhatsAppa, jeśli pieczęci nie ma w kodzie.
- **ustawienia.** Wygląd, język, zgody. Osobno klucze API: użytkownik wkleja własny klucz do xAI (Grok), Gemini, OpenAI, Anthropic, Mistral, DeepSeek, Groq, OpenRouter. Wybiera dostawcę, ścieżkę i model z katalogu. Adresu nie wpisuje — wolny URL to SSRF. Klucz szyfrowany w bazie, w odpowiedzi API go nie ma. Przycisk „Sprawdź mój klucz”. Wybór silnika w przeglądarce. Gdy klucza nie ma albo dostawca nie odpowie, asystent spada na Ollamę na tej maszynie (`phi4-mini`), a kod na `qwen2.5-coder:7b`. Endpointy i identyfikatory modeli sprawdź w oficjalnej dokumentacji w dniu budowy. Nie zgaduj.
- **asystent.** Jedno okno rozmowy z wybranym silnikiem. Nie dwa.
- **studio.** Prawdziwy post: tekst i obraz. Osobno wideo, muzyka, projekt kodu. Kod idzie przez silnik użytkownika.
- **bengtok.** Feed: posty, obraz, polubienie, komentarz.
- **profil.** Jak profil: zdjęcie, tło, nazwa, bio, lista rzeczy tej osoby.
- **bridge.** Migowy, napisy, mowa, Morse. Narzędzia mają działać w przeglądarce, nie być opisem.
- **dev.** Podłączenie repozytorium i lista spraw. Bez repozytorium ekran mówi, co zrobić, i nie udaje danych.
- **wyszukiwarka.** Jedno pole. Wynik prowadzi do modułu albo do asystenta.

Każdy przycisk na tych ekranach robi to, co mówi. Jak funkcji nie ma, nie rysuj jej.

## Maszyna

Next.js (App Router) + API + Postgres + Redis. Ciemny motyw od pierwszej klatki. TypeScript ma `noUncheckedIndexedAccess`: nie czytaj `arr[0].pole` bez sprawdzenia, że element jest. `next build` musi przejść. Nie ustawiaj `ignoreBuildErrors`.

Wdrożenie jedną komendą na Ubuntu (Oracle, aarch64), katalog `~/TIKBENGOS`:

```bash
curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/scripts/wdroz.sh | bash
```

Skrypt klonuje albo fast-forwarduje `main`, nie nadpisuje istniejącego `.env`, stawia Docker Compose, migruje bazę. Domena `bengos.pl`, e-mail certyfikatu `axelgadomski@gmail.com`.

`SCHEME` wylicz zawsze z domeny, także gdy `.env` już jest. Inaczej `set -u` urywa skrypt na końcu, gdy stos już stoi. Zdrowie API to `GET /v1/health`. Test wewnątrz Django wysyła nagłówek `Host` z `ALLOWED_HOSTS`. Goły klient testowy bije w `testserver` i dostaje 400, choć API żyje. Publiczny test to `https://bengos.pl/v1/health`, nie `/api/health`.

Ollama jest na hoście, słucha `0.0.0.0:11434`. Kontener woła ją przez `host.docker.internal`. Modeli, które już są, nie kasuj.

Nie commituj `.env`, kluczy ani sekretów.

## Odbiór

Gotowe jest wtedy, gdy:

1. `https://bengos.pl` pokazuje samą kulę i dziewięć słów dookoła, w miejscach z tabeli.
2. Każde słowo wchodzi w swój moduł, a logo w pasku wraca na kulę.
3. Rejestracja, logowanie, post, rozmowa z pieczęcią i zapis własnego klucza API przechodzą.
4. `next build` i `GET /v1/health` zwracają sukces.
5. W repozytorium nie ma drugiego, niewpiętego menu.
