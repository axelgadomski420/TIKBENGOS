# Cloudflare — jak ustawić stały adres HTTPS dla BENGOS

Ten dokument opisuje **jedną rzecz**: jak zamienić losowy adres
`*.trycloudflare.com` na stały adres własnej domeny.

---

## Dlaczego adres się zmienia

Obecny tunel działa w trybie szybkim (`cloudflared tunnel --url`). Nie wymaga
konta, więc Cloudflare przydziela adres losowo i zmienia go przy każdym
restarcie kontenera. To nie jest awaria i nie da się tego naprawić
w konfiguracji — sam Cloudflare pisze o tym w logu:

> be aware that these account-less Tunnels have no uptime guarantee

Stały adres wymaga **nazwanego tunelu**, a ten wymaga konta i domeny.

---

## Czego potrzebujesz

- konta Cloudflare — plan darmowy wystarcza
- domeny, dowolnej; wystarczy najtańsza, byle dało się zmienić jej serwery nazw

Domeny nie kupię i nie mam dostępu do Twojego konta. Kroki poniżej wykonujesz
sam; konfiguracja po stronie repozytorium jest już gotowa
(`infra/docker-compose.tunnel-named.yml`).

---

## Krok 1 — dodaj domenę do Cloudflare

1. Wejdź na `dash.cloudflare.com` i zaloguj się (albo załóż konto).
2. **Add a site** → wpisz swoją domenę → wybierz plan **Free**.
3. Cloudflare pokaże **dwa serwery nazw**, na przykład:
   `ada.ns.cloudflare.com` i `bob.ns.cloudflare.com`.
4. Wejdź do panelu rejestratora, u którego kupiłeś domenę, i **zmień
   serwery nazw** na te dwa. Usuń poprzednie.
5. Wróć do Cloudflare i kliknij **Check nameservers**. Propagacja trwa
   zwykle kilkanaście minut, czasem do 24 godzin.

---

## Krok 2 — utwórz tunel

1. W panelu Cloudflare: **Zero Trust** → **Networks** → **Tunnels**.
2. Kliknij **Create a tunnel**.
3. Wybierz **Cloudflared** jako typ łącznika.
4. Nazwij tunel, np. `bengos`.
5. Panel pokaże **instrukcję instalacji z tokenem**. Zatrzymaj się na tym
   ekranie — potrzebny jest sam token, którego szukaj w poleceniu:

   ```
   cloudflared service install eyJhIjoi...długi-łańcuch...
   ```

   Token to ten długi łańcuch po słowie `install`. **Nie uruchamiaj tego
   polecenia na maszynie** — tunel stoi w kontenerze Dockera i tam trafia
   token, a nie do usługi systemowej.

6. Skopiuj token i wróć tutaj, do kroku 3.

> **Uwaga o bezpieczeństwie.** Token jest sekretem. Nie wklejaj go nigdzie
> publicznie — w tym na czacie, w zgłoszeniu ani w opisie problemu. Traktuj go
> jak hasło: daje kontrolę nad tunelem. Jeśli wyciekł, w panelu możesz go
> unieważnić i wygenerować nowy.

---

## Krok 3 — wskaż, dokąd tunel ma kierować ruch

W tym samym kreatorze, w sekcji **Public Hostname**:

| Pole | Wartość |
| --- | --- |
| Subdomain | `bengos` |
| Domain | wybierz swoją domenę |
| Path | zostaw puste |
| Type | `HTTP` |
| URL | `proxy:80` |

Zapisz. Od tego momentu **każde** żądanie na `https://bengos.twojadomena.pl`
idzie do Caddy'ego w sieci Dockera, a Caddy rozdziela je dalej tak samo jak
w trybie szybkim.

> **Dlaczego `proxy:80`, a nie `localhost:80`.** Tunel stoi w kontenerze
> i zna inne kontenery po nazwach usług w sieci Dockera. `proxy` to nazwa
> usługi Caddy'ego w `infra/docker-compose.prod.yml`. `localhost` wskazywałby
> na sam kontener tunelu, gdzie nic nie nasłuchuje.

---

## Krok 4 — wpisz wartości do `.env`

Na maszynie, w katalogu repozytorium:

```shell
cd ~/TIKBENGOS
printf 'CLOUDFLARE_TUNNEL_TOKEN=%s\n' 'WKLEJ_TUTAJ_TOKEN_Z_PANELU' >> .env
sed -i 's|^DOMAIN=.*|DOMAIN=bengos.twojadomena.pl|' .env
sed -i 's|^ALLOWED_HOSTS=.*|ALLOWED_HOSTS=bengos.twojadomena.pl,api,api:8000,web,web:3000,127.0.0.1,localhost|' .env
sed -i 's|^CSRF_TRUSTED_ORIGINS=.*|CSRF_TRUSTED_ORIGINS=https://bengos.twojadomena.pl|' .env
sed -i 's|^NEXT_PUBLIC_REALTIME_URL=.*|NEXT_PUBLIC_REALTIME_URL=wss://bengos.twojadomena.pl/ws|' .env
grep -E '^(DOMAIN|ALLOWED_HOSTS|CSRF_TRUSTED_ORIGINS|NEXT_PUBLIC_REALTIME_URL)=' .env
```

Podmień `bengos.twojadomena.pl` na **swoją** nazwę w każdej z tych linii.
Ostatnie polecenie wypisze wynik — sprawdź, czy wszędzie jest ta sama nazwa.

> **Uwaga o `ALLOWED_HOSTS`.** Obok publicznej nazwy zostają `api`, `api:8000`,
> `web` i `web:3000`. To nazwy usług w sieci Dockera — interfejs woła API
> przez nie, a Django odrzuca żądanie z hostem, którego nie ma na tej liście.
> Usunięcie ich zepsułoby rejestrację i logowanie.

---

## Krok 5 — zatrzymaj stary tunel i podnieś nazwany

```shell
cd ~/TIKBENGOS
sudo docker compose -f infra/docker-compose.tunnel.yml down
sudo docker compose --env-file .env -f infra/docker-compose.prod.yml up -d api
sudo docker compose --env-file .env -f infra/docker-compose.tunnel-named.yml up -d
sleep 15
sudo docker compose --env-file .env -f infra/docker-compose.tunnel-named.yml logs --tail=20 cloudflared
```

W logu szukaj linii `Registered tunnel connection`. To znaczy, że tunel
wstał i jest podłączony.

> **Dwa pliki compose nie mogą działać naraz.** Oba definiują kontener
> o nazwie `cloudflared` w tej samej sieci. Pierwsze polecenie zatrzymuje
> stary tunel — bez tego drugi nie wystartuje.

---

## Krok 6 — sprawdź

```shell
curl -s -o /dev/null -w "%{http_code}\n" https://bengos.twojadomena.pl/v1/health
```

`200` znaczy, że działa. Potem otwórz `https://bengos.twojadomena.pl`
w przeglądarce i załóż konto. Adres **nie zmieni się** już nigdy,
niezależnie od restartów maszyny.

---

## Gdy coś nie działa

| Objaw | Co sprawdzić |
| --- | --- |
| `502 Bad Gateway` | Czy `curl -s http://127.0.0.1/v1/health` daje `200`. Tunel działa, nie działa aplikacja. |
| `403 Forbidden` | Czy w kroku 3 URL to `proxy:80`, a nie `localhost`. |
| Pusta strona, brak treści | Czy `DOMAIN` w `.env` to dokładnie ta nazwa, którą wpisałeś w panelu. |
| Tunel w logu pisze `Unauthorized` | Token jest nieaktualny — wygeneruj nowy w panelu i popraw `.env`. |
| Rejestracja zwraca błąd | Czy `ALLOWED_HOSTS` zawiera publiczną nazwę **i** `api`, `api:8000`. |

Log tunelu nazwanego:

```shell
sudo docker compose --env-file .env -f infra/docker-compose.tunnel-named.yml logs --tail=40 cloudflared
```

---

## Czego ten dokument nie obiecuje

Nie kupuje domeny, nie zmienia serwerów nazw za Ciebie i nie zakłada konta.
Te trzy rzeczy są poza repozytorium i poza tym, co da się zautomatyzować
z maszyny. Reszta — konfiguracja, wdrożenie, sprawdzenie — jest gotowa.
