#!/usr/bin/env python3
"""Weryfikuje, że repozytorium ma wszystko, czego wymaga pierwsze uruchomienie.

Uruchomienie (w korzeniu repozytorium, bez Dockera i bez Pythona z zależnościami):
    python3 scripts/audyt.py

Po co osobny plik: przed wdrożeniem trzeba odpowiedzieć na pytanie „czy niczego
nie brakuje”, i odpowiedzieć na to SZYBKO, bez stawiania bazy. Ten skrypt
sprawdza tylko ISTNIENIE plików i kilka niezmienników treści — nie uruchamia
niczego i nie łączy się z siecią.

Czego NIE robi: nie sprawdza, czy kod działa. To robi `scripts/dev.sh`
(migracje i testy) oraz `scripts/sprawdz.py` (odpowiedź HTTP).
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ── Czego wymaga pierwsze uruchomienie ────────────────────────────────
# Każda pozycja to (ścieżka, czy blokuje twardo, dlaczego).
WYMAGANE = [
    # Interfejs
    ("apps/web/package.json", True, "bez tego npm nie wie, co zainstalować"),
    ("apps/web/next.config.ts", True, "bez standalone obraz nie znajdzie server.js"),
    ("apps/web/postcss.config.js", True, "bez tego dyrektywy @tailwind wywalają build"),
    ("apps/web/tailwind.config.js", True, "bez tego dyrektywy @tailwind wywalają build"),
    ("apps/web/Dockerfile", True, "compose buduje obraz web z tego pliku"),
    ("apps/web/src/app/layout.tsx", True, "App Router wymaga layout.tsx w app/"),
    ("apps/web/src/app/globals.css", True, "importowany przez layout.tsx"),
    ("apps/web/public/manifest.webmanifest", True, "PWA deklaruje go w metadata"),
    # API
    ("services/api/Dockerfile", True, "compose buduje obraz api z tego pliku"),
    ("services/api/requirements.txt", True, "bez tego obraz nie ma Django"),
    ("services/api/manage.py", True, "punkt wejścia Django"),
    ("services/api/tikbengos/settings.py", True, "konfiguracja Django"),
    ("services/api/tikbengos/urls.py", True, "adresy API"),
    ("services/api/tikbengos/wsgi.py", True, "gunicorn ładuje ten moduł"),
    ("services/api/tikbengos/asgi.py", True, "uvicorn ładuje ten moduł"),
    ("services/api/accounts/models.py", True, "modele tożsamości"),
    ("services/api/accounts/migrations/0001_initial.py", True, "bez migracji nie ma tabel"),
    # Czas rzeczywisty
    ("services/realtime/Dockerfile", True, "compose buduje obraz realtime z tego pliku"),
    # Infrastruktura
    ("infra/docker-compose.prod.yml", True, "to jest plik wdrożenia"),
    ("infra/Caddyfile", True, "bez tego nie ma TLS ani przekierowania /ws"),
    ("infra/.env.prod.example", False, "wzór; deploy.sh generuje .env sam"),
    # Kontrakty i design system
    ("packages/core/src/index.ts", True, "bez tego import @bengos/core nie działa"),
    ("packages/core/src/providers.ts", True, "katalog dostawców"),
    ("packages/ui/src/index.ts", True, "bez tego import @bengos/ui nie działa"),
    ("packages/ui/src/styles.css", True, "importowany przez layout.tsx"),
    # Skrypty
    ("scripts/deploy.sh", False, "wdrożenie na Oracle"),
    ("scripts/dev.sh", False, "lokalny start bez Dockera"),
    ("scripts/sprawdz.py", False, "weryfikacja po wdrożeniu"),
    ("scripts/generate-icons.py", False, "generator ikon PWA"),
    # CI
    (".github/workflows/ci.yml", False, "testy na push"),
    (".github/workflows/deploy.yml", False, "wdrożenie z Actions"),
    # Dokumentacja, do której odsyła README
    ("README.md", True, "bez tego nie wiadomo, jak zacząć"),
    ("LICENSE", False, "README się do niego odwołuje"),
    ("THIRD_PARTY.md", False, "README się do niego odwołuje"),
    ("docs/stage-1.md", False, "stan prac"),
    ("docs/accessibility.md", False, "wymagania dostępności"),
    ("docs/licensing.md", False, "stan licencji"),
    ("docs/deploy-oracle.md", False, "instrukcja wdrożenia"),
]

# ── Ikony PWA są osobno: manifest je wymienia, a Dockerfile je kopiuje ─
IKONY = [
    "apps/web/public/icons/icon-192.png",
    "apps/web/public/icons/icon-512.png",
    "apps/web/public/icons/icon-maskable-512.png",
]


def wczytaj_json(scierzka: Path):
    try:
        return json.loads(scierzka.read_text(encoding="utf-8"))
    except Exception:
        return None


def sprawdz_manifest(bledy: list, ostrzezenia: list) -> None:
    """Manifest wskazuje trzy ikony — sprawdzamy, czy wskazuje DOKŁADNIE te,
    które produkuje generator. Rozjazd nazw to cichy błąd: PWA instaluje się
    bez ikony, a nikt nie widzi, dlaczego."""
    manifest = wczytaj_json(ROOT / "apps/web/public/manifest.webmanifest")
    if manifest is None:
        bledy.append("manifest.webmanifest nie jest poprawnym JSON")
        return

    zadeklarowane = {ikona.get("src") for ikona in manifest.get("icons", [])}
    oczekiwane = {"/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"}

    brakujace_w_manifescie = oczekiwane - zadeklarowane
    if brakujace_w_manifescie:
        ostrzezenia.append(f"manifest nie deklaruje: {sorted(brakujace_w_manifescie)}")

    for sciezka in IKONY:
        if not (ROOT / sciezka).exists():
            ostrzezenia.append(
                f"brak pliku ikony: {sciezka} — uruchom: python3 scripts/generate-icons.py"
            )


def sprawdz_spojnosc_adresow(bledy: list, ostrzezenia: list) -> None:
    """Adres kanału czasu rzeczywistego musi się zgadzać w trzech miejscach.

    Ten rozjazd był już raz błędem w tym projekcie: klient celował w adres,
    którego serwer nie znał, a kontener raportował „running”. Sprawdzamy
    więc nazwę trasy po obu stronach.
    """
    routing = ROOT / "services/api/accounts/routing.py"
    if not routing.exists():
        bledy.append("brak services/api/accounts/routing.py — nie ma tras WebSocket")
        return

    tresc_routingu = routing.read_text(encoding="utf-8")
    if 'path("ws/chat/' not in tresc_routingu:
        bledy.append("routing.py nie ma trasy ws/chat/ — klient jej szuka")

    # Klient dokleja `/chat/` do wartości z env, więc wartość musi kończyć
    # się na `/ws`.
    wzory = ["apps/web/.env.local.example", "infra/.env.prod.example"]
    for wzor in wzory:
        sciezka = ROOT / wzor
        if not sciezka.exists():
            continue
        for linia in sciezka.read_text(encoding="utf-8").splitlines():
            if linia.startswith("NEXT_PUBLIC_REALTIME_URL="):
                wartosc = linia.split("=", 1)[1].strip()
                if not wartosc.endswith("/ws"):
                    ostrzezenia.append(
                        f"{wzor}: NEXT_PUBLIC_REALTIME_URL nie kończy się na /ws — "
                        "klient dokleja nazwę kanału, więc wyjdzie zły adres"
                    )


def sprawdz_brak_domyslek(bledy: list, ostrzezenia: list) -> None:
    """compose produkcyjny NIE MOŻE mieć domyślnych haseł.

    Domyślka na publicznej maszynie to baza otwarta dla każdego, kto zgadnie
    port. Wzorzec `${VAR:?komunikat}` przerywa start, gdy brak wartości.
    """
    compose = ROOT / "infra/docker-compose.prod.yml"
    if not compose.exists():
        return
    tresc = compose.read_text(encoding="utf-8")
    for wzorzec in ["change-me", "POSTGRES_PASSWORD:-", "SECRET_KEY:-"]:
        if wzorzec in tresc:
            bledy.append(
                f"infra/docker-compose.prod.yml zawiera domyślkę „{wzorzec}” — "
                "brak zmiennej musi zatrzymywać start"
            )


def main() -> int:
    bledy: list[str] = []
    ostrzezenia: list[str] = []
    brakujace_twarde: list[str] = []
    brakujace_miekkie: list[str] = []

    print(f"Audyt repozytorium: {ROOT}")
    print("=" * 68)

    for sciezka, twardo, powod in WYMAGANE:
        if not (ROOT / sciezka).exists():
            (brakujace_twarde if twardo else brakujace_miekkie).append(sciezka)
            print(f"[{'BŁĄD' if twardo else 'BRAK'}] {sciezka}")
            print(f"       {powod}")

    sprawdz_manifest(bledy, ostrzezenia)
    sprawdz_spojnosc_adresow(bledy, ostrzezenia)
    sprawdz_brak_domyslek(bledy, ostrzezenia)

    if brakujace_twarde or brakujace_miekkie:
        print("=" * 68)

    for pozycja in brakujace_twarde:
        bledy.append(f"brakuje (blokuje uruchomienie): {pozycja}")
    for pozycja in brakujace_miekkie:
        ostrzezenia.append(f"brakuje (nie blokuje): {pozycja}")

    print("=" * 68)
    print(f"Twarde braki:     {len(brakujace_twarde)}")
    print(f"Miękkie braki:    {len(brakujace_miekkie)}")
    print(f"Błędy treści:     {len(bledy) - len(brakujace_twarde)}")
    print()

    if bledy:
        print("BŁĘDY — do naprawy przed uruchomieniem:")
        for blad in bledy:
            print(f"  - {blad}")
        print()

    if ostrzezenia:
        print("OSTRZEŻENIA — nie blokują, ale warto wiedzieć:")
        for ostrzezenie in ostrzezenia:
            print(f"  - {ostrzezenie}")
        print()

    print("Czego TEN skrypt NIE sprawdza:")
    print("  - czy kod się buduje (npm run build)")
    print("  - czy migracje przechodzą (python manage.py migrate)")
    print("  - czy testy przechodzą (python manage.py test)")
    print("  - czy API odpowiada (scripts/sprawdz.py)")
    print("  Wszystko to robi scripts/dev.sh — lokalnie, bez Dockera.")

    return 0 if not bledy else 1


if __name__ == "__main__":
    sys.exit(main())
