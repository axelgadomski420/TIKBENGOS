# Wdrożenie TIKBENGOS na Oracle Cloud — krok po kroku

Ten dokument opisuje drogę od pustego konta Oracle do działającej aplikacji
z certyfikatem i własną domeną. Każdy krok ma powód, nie tylko polecenie —
bo kroki bez powodu są pomijane, gdy wydają się zbędne.

**Skrót:** na maszynie wystarczy `bash scripts/deploy.sh` — skrypt robi
wszystko z punktów 4–8. Ten dokument jest po to, żeby wiedzieć, CO ten skrypt
robi i co zrobić, gdy coś padnie.

## 0. Sprawdź komplet plików, zanim zaczniesz

```bash
python3 scripts/audyt.py
```

Bez Dockera, bez sieci, bez bazy. Wypisze, czego brakuje i co to blokuje.

## 1. Konto Oracle Cloud

Rejestracja: <https://signup.cloud.oracle.com/>

**Region domowy wybierz świadomie.** Zmienić go później nie można, a darmowe
maszyny powstają wyłącznie w regionie domowym. Z Polski: Europe (Frankfurt)
albo Europe (Amsterdam) — najbliżej, najniższe opóźnienia.

Karta jest wymagana do weryfikacji, także w darmowym planie. Nie jest
obciążana, dopóki nie przejdziesz na plan płatny.

## 2. Maszyna

W konsoli: **Compute → Instances → Create instance**.

| Pole | Wartość | Dlaczego taka |
| --- | --- | --- |
| Availability domain | ten z dopiskiem **Always Free Eligible** | poza nim maszyna wyjdzie poza darmowy limit |
| Shape | `VM.Standard.A1.Flex` (Ampere, ARM) | ta rodzina jest w darmowym planie |
| OCPU / Memory | 2 / 12 GB | **to jest cały darmowy limit** — Oracle zmniejszył go w czerwcu 2026 z 4/24 |
| Image | Ubuntu LTS, architektura **aarch64** | `apt` jest w każdym poradniku, `dnf` nie |
| Boot volume | min. 47 GB, do 200 GB łącznie | mniejszy się nie utworzy |

Klucz SSH pobierz i **zachowaj**. Zgubiony klucz oznacza utratę dostępu do
maszyny — zostaje tylko usunięcie i utworzenie nowej.

## 3. Porty — dwa miejsca, nie jedno

To najczęstsza przyczyna „otworzyłem port i nie działa”.

**Panel Oracle:** instancja → Subnet → Security Lists → *Default Security List* →
Add Ingress Rules. Z `Source CIDR = 0.0.0.0/0`, TCP, porty `80` i `443`.

**Na samej maszynie:** obrazy Oracle mają własne `iptables`, które blokuje
ruch przychodzący mimo reguły w panelu. `scripts/deploy.sh` robi to za Ciebie,
ale ręcznie wygląda to tak:

```bash
sudo iptables -L INPUT --line-numbers -n   # zapisz numer reguły REJECT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Reguły trzeba wstawić **przed** regułą `REJECT`, dlatego najpierw sprawdzasz
jej numer.

## 4. Docker

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit   # i połącz się ponownie — inaczej grupa docker nie zadziała
```

## 5. Kod i sekrety

```bash
git clone https://github.com/axelgadomski420/TIKBENGOS.git
cd TIKBENGOS
bash scripts/deploy.sh
```

Skrypt utworzy `.env` sam — z wygenerowanym `SECRET_KEY`, kluczem Fernet
do szyfrowania kluczy dostawców i dwoma różnymi hasłami (baza, Redis).
Nic nie musisz wymyślać. Plik dostaje uprawnienia `600`, więc czyta go tylko
właściciel.

Gdy wolisz uzupełnić ręcznie:

```bash
cp infra/.env.prod.example .env
nano .env
```

Uzupełnij `SECRET_KEY`, `FIELD_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`,
`REDIS_PASSWORD`, `DOMAIN`, `ACME_EMAIL`, `ALLOWED_HOSTS`,
`CSRF_TRUSTED_ORIGINS` i `NEXT_PUBLIC_REALTIME_URL`.

`FIELD_ENCRYPTION_KEY` generuje się **raz**. Zmiana tego klucza po zapisaniu
jakiegokolwiek klucza dostawcy uniemożliwia jego odszyfrowanie — dane
w bazie zostają, ale są bezużyteczne.

## 6. DNS przed uruchomieniem

Caddy zamawia certyfikat, gdy domena już wskazuje na maszynę. Rekord `A`
dla `DOMAIN` → publiczne IP instancji. Sprawdź, że działa:

```bash
dig +short twojadomena.pl
```

Dopóki nie zwraca Twojego IP, uruchamianie nie ma sensu — Let's Encrypt
odrzuci weryfikację i certyfikatu nie będzie.

**Bez domeny też da się uruchomić**, ale wtedy nie ma HTTPS, a bez HTTPS
ciasteczko sesji z `SESSION_COOKIE_SECURE` nie dojedzie — czyli logowanie
nie zadziała. Aplikacja wstanie i będzie widoczna, ale kont nie założysz.

## 7. Uruchomienie

Skrypt `deploy.sh` robi to sam. Ręcznie — jedna komenda:

```bash
sudo docker compose -f infra/docker-compose.prod.yml up -d --build
sudo docker compose -f infra/docker-compose.prod.yml ps
sudo docker compose -f infra/docker-compose.prod.yml logs api --tail=50
```

Migracje wykonują się same — komenda `api` zaczyna się od `migrate --noinput`.
Pierwsze budowanie trwa kilka minut: powstaje pięć obrazów.

## 8. Sprawdzenie

**Najpierw wewnątrz kontenera** — to odróżnia „nie działa Django” od
„nie działa sieć przed nim”:

```bash
docker compose -f infra/docker-compose.prod.yml exec api python manage.py sprawdz
```

Ta komenda sprawdza klucz szyfrowania (czy jest poprawnym kluczem Fernet),
połączenie z bazą, komplet migracji i odpowiedź Django — bez sieci.

**Potem z zewnątrz:**

```bash
python3 scripts/sprawdz.py https://twojadomena.pl
```

Trzy testy prawdziwym żądaniem HTTP. Skrypt wypisze też, czego nie sprawdził.

Ręcznie, gdy chcesz zobaczyć surową odpowiedź:

```bash
curl -s https://twojadomena.pl/api/health         # {"status": "ok"}
curl -s https://twojadomena.pl/api/csrf           # {"csrfToken": "..."}
curl -s https://twojadomena.pl/api/config         # ścieżki kontraktu
curl -s -o /dev/null -w '%{http_code}\n' https://twojadomena.pl/api/settings/keys
# ostatni zwróci 401 — i to jest POPRAWNA odpowiedź, bo wymaga zalogowania
```

## 9. Co zrobić, gdy nie działa

```bash
bash scripts/napraw.sh          # stan usług, pamięć, test dymny, adres kanału
bash scripts/napraw.sh klucz    # czy FIELD_ENCRYPTION_KEY jest poprawny
bash scripts/napraw.sh migracje # brakujące migracje
bash scripts/napraw.sh restart  # przebuduj i podnieś od nowa
bash scripts/napraw.sh kopia    # zrzut bazy do pliku
bash scripts/napraw.sh dysk     # ile miejsca zajmują obrazy i wolumeny
```

| Objaw | Najczęstsza przyczyna | Gdzie sprawdzić |
| --- | --- | --- |
| Strona się nie ładuje | porty nieotwarte w OBU miejscach | Security List w panelu **i** `iptables` na maszynie |
| Certyfikatu nie ma, Caddy krzyczy o ACME | rekord A nie wskazuje IP | `dig +short DOMAIN` |
| Interfejs działa, `/api/...` zwraca 502 | API nie wstał (błąd migracji) | `docker compose logs api --tail=50` |
| Logowanie zwraca 403 | brak tokenu CSRF albo ciasteczko `Secure` bez HTTPS | `/api/csrf` ma zwracać token, a strona musi być na `https://` |
| `migrate` pada | rozjazd migracji pisanych ręcznie | `docker compose exec api python manage.py makemigrations --check --dry-run` |
| Kontener `realtime` jest „running”, a kanał nie działa | brak `NEXT_PUBLIC_REALTIME_URL` w `.env` | `docker compose logs realtime --tail=30` |
| Klucze dostawców przestały się odszyfrowywać | zmieniono `FIELD_ENCRYPTION_KEY` | `bash scripts/napraw.sh klucz` |

## 10. Czego ten dokument nie zastąpi

- **Kopii zapasowej bazy.** `db-data` to wolumen Dockera na tej samej
  maszynie. Utrata maszyny to utrata danych. Ręcznie:
  `bash scripts/napraw.sh kopia`, a w zakładce Actions jest gotowa akcja
  *kopia-bazy*, która zapisze zrzut jako artefakt na 7 dni.
- **Monitoringu.** Nikt nie powiadomi Cię, że aplikacja padła. `napraw.sh`
  pokazuje stan, ale trzeba go uruchomić samemu.
- **Aktualizacji.** `apt upgrade` i przebudowa obrazów pozostają ręczne.

Każda z tych trzech rzeczy to osobne zadanie, nie „przy okazji”.
