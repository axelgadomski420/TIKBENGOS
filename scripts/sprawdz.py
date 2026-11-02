#!/usr/bin/env python
"""Sprawdza, że aplikacja odpowiada — do użycia po pierwszym uruchomieniu.

Uruchomienie (na maszynie, po `docker compose up`):
    python3 scripts/sprawdz.py

Albo wskazując adres:
    python3 scripts/sprawdz.py https://twojadomena.pl

Po co osobny plik: po wdrożeniu trzeba odpowiedzieć na pytanie „czy to
naprawdę działa”, a nie „czy kontener stoi w stanie running”. Kontener
działa, gdy proces żyje — a to co innego niż to, że żądanie dochodzi do
Django i wraca z sensowną odpowiedzią.

Skrypt sprawdza trzy rzeczy i wypisuje wynik każdej. Nie sprawdza wszystkiego
i nie udaje, że sprawdza — czego NIE sprawdza, jest wypisane na końcu.
"""

import json
import sys
import urllib.error
import urllib.request


def pobierz(url: str, *, timeout: float = 10.0) -> tuple[int, str]:
    """Zwraca (kod, treść). Błąd HTTP to wynik, nie wyjątek — 401 też nas interesuje."""
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        return 0, str(exc.reason)


def main() -> int:
    bazowy = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://127.0.0.1"
    podstawowy = bazowy

    print(f"Sprawdzam: {podstawowy}")
    print("=" * 60)

    wyników_ok = 0
    wyników_brak = 0

    # 1. Interfejs — czy Caddy w ogóle odpowiada.
    kod, tresc = pobierz(podstawowy)
    if kod == 200:
        print(f"[OK]   Interfejs odpowiada (HTTP 200, {len(tresc)} znaków HTML)")
        wyników_ok += 1
    else:
        print(f"[BŁĄD] Interfejs NIE odpowiada (kod: {kod or 'brak połączenia'})")
        if tresc:
            print(f"       {tresc[:200]}")
        wyników_brak += 1

    # 2. Health — czy żądanie dochodzi do Django. To jest test drogi
    #    Caddy → Next.js → proxy → gunicorn → Django, a nie tylko soketu.
    kod, tresc = pobierz(f"{podstawowy}/api/health")
    try:
        payload = json.loads(tresc) if tresc else {}
    except json.JSONDecodeError:
        payload = {}
    if kod == 200 and payload.get("status") == "ok":
        print("[OK]   API odpowiada (/api/health -> status ok)")
        wyników_ok += 1
    else:
        print(f"[BŁĄD] API NIE odpowiada (kod: {kod or 'brak połączenia'}, treść: {tresc[:120]})")
        wyników_brak += 1

    # 3. CSRF — czy endpoint wydaje token i ustawia ciasteczko.
    kod, tresc = pobierz(f"{podstawowy}/api/csrf")
    try:
        token = (json.loads(tresc) if tresc else {}).get("csrfToken", "")
    except json.JSONDecodeError:
        token = ""
    if kod == 200 and token:
        print(f"[OK]   CSRF działa (token {len(token)} znaków)")
        wyników_ok += 1
    else:
        print(f"[BŁĄD] CSRF NIE działa (kod: {kod or 'brak połączenia'}, treść: {tresc[:120]})")
        wyników_brak += 1

    print("=" * 60)
    print(f"Wynik: {wyników_ok} OK, {wyników_brak} błędów")

    print("\nCzego TEN skrypt NIE sprawdza:")
    print("  - czy baza ma tabele (to `migrate`; zobacz logi: docker compose ... logs api)")
    print("  - czy kanał WebSocket działa (wymaga przeglądarki, nie da się z curl)")
    print("  - czy certyfikat jest ważny i czy przekierowanie HTTP->HTTPS działa")
    print("  - czy logowanie zadziała (wymaga ciasteczek, a curl ich nie zapisuje domyślnie)")

    return 0 if wyników_brak == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
