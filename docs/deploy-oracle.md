# Wdrożenie TIKBENGOS na Oracle Cloud — krok po kroku

Ten dokument opisuje drogę od pustego konta Oracle do działającej aplikacji
z certyfikatem i własną domeną. Każdy krok ma powód, nie tylko polecenie —
bo kroki bez powodu są pomijane, gdy wydają się zbędne.

Czego ten dokument **nie** obiecuje: że darmowy plan Oracle wystarczy
na wszystko. Worker muzyczny potrzebuje karty graficznej z 16 GB pamięci
i na maszynie aplikacyjnej nie ma prawa działać. To jest osobna usługa,
tak jak `docs/stage-1.md` już ustala.

## 1. Konto Oracle Cloud

Rejestracja: <https://signup.cloud.oracle.com/>

**Region domowy wybierz świadomie.** Zmienić go później nie można, a darmowe
maszyny powstają wyłącznie w regionie domowym. Z Polski: Europe (Frankfurt)
albo Europe (Amsterdam) — najbliżej, najniższe opóźnienia.

Potrzebna jest karta, także w darmowym planie. Karta służy do weryfikacji
tożsamości i nie jest obciążana, dopóki nie przejdziesz na plan płatny.

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
ruch przychodzący mimo reguły w panelu.

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
cp infra/.env.prod.example .env
nano .env
```

Uzupełnij `SECRET_KEY`, `FIELD_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`,
`REDIS_PASSWORD`, `DOMAIN`, `ACME_EMAIL`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`.

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

## 7. Uruchomienie

```bash
sudo docker compose -f infra/docker-compose.prod.yml up -d --build
sudo docker compose -f infra/docker-compose.prod.yml ps
sudo docker compose -f infra/docker-compose.prod.yml logs api --tail=50
```

Migracje wykonują się same — komenda `api` zaczyna się od `migrate --noinput`.

## 8. Sprawdzenie

```bash
curl -s https://twojadomena.pl/api/csrf          # powinno zwrócić {"csrfToken": "..."}
curl -s https://twojadomena.pl/api/settings/providers | head -c 200
```

Pierwsze polecenie sprawdza całą drogę: proxy → API → Django. Drugie wymaga
zalogowania, więc zwróci `401` — i to jest poprawna odpowiedź.

## 9. Czego ten dokument nie zastąpi

- **Kopii zapasowej bazy.** `db-data` to wolumen Dockera na tej samej
  maszynie. Utrata maszyny to utrata danych — potrzebny `pg_dump` na
  zewnętrzny magazyn, a tego tu nie ma.
- **Monitoringu.** Nikt nie powiadomi Cię, że aplikacja padła.
- **Aktualizacji.** `apt upgrade` i przebudowa obrazów pozostają ręczne.

Każda z tych trzech rzeczy to osobne zadanie, nie „przy okazji”.
