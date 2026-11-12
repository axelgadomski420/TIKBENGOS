"""Sprawdzenie, że żądanie dochodzi do Django — test dymny na produkcji.

Uruchomienie w kontenerze:
    python manage.py sprawdz

Po co komenda, a nie skrypt zewnętrzny: `scripts/sprawdz.py` działa
z zewnątrz i wymaga sieci. Ta wersja działa WEWNĄTRZ kontenera, więc gdy
`sprawdz.py` mówi „brak połączenia”, ta komenda powie, czy nie działa
Django, czy nie działa sieć przed nim. To są dwie różne awarie.

Sprawdza cztery rzeczy:
1. czy ustawienia się importują (czy `FIELD_ENCRYPTION_KEY` jest poprawnym
   kluczem Fernet — najczęstszy błąd przy kopiowaniu `.env`),
2. czy połączenie z bazą działa,
3. czy migracje są w komplecie (żadna nie czeka),
4. czy Blueprint aplikacji odpowiada na żądanie w pamięci.

Czego NIE sprawdza: Redisa, certyfikatu i kanału WebSocket.
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


class Command(BaseCommand):
    help = "Sprawdza konfigurację, bazę, migracje i odpowiedź Django w pamięci."

    def handle(self, *args, **options) -> None:
        from django.conf import settings

        bledy: list[str] = []

        # 1. Klucz szyfrowania. Budowa szyfratora to jedyny sposób, żeby
        #    stwierdzić, że klucz ma poprawny format — samą długość można
        #    oszukać, a błąd widać dopiero przy pierwszym zapisie klucza.
        try:
            from accounts.crypto import encrypt_secret, decrypt_secret

            probka = "sprawdzenie"
            if decrypt_secret(encrypt_secret(probka)) != probka:
                bledy.append("FIELD_ENCRYPTION_KEY: szyfrowanie nie odtwarza wartości")
            else:
                self.stdout.write(self.style.SUCCESS("OK   FIELD_ENCRYPTION_KEY działa"))
        except Exception as exc:  # noqa: BLE001 - chcemy każdego powodu
            bledy.append(f"FIELD_ENCRYPTION_KEY: {exc}")

        # 2. Baza.
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            self.stdout.write(
                self.style.SUCCESS(f"OK   Baza odpowiada ({settings.DATABASES['default']['ENGINE'].split('.')[-1]})")
            )
        except Exception as exc:  # noqa: BLE001
            bledy.append(f"Baza nie odpowiada: {exc}")
            self.stdout.write("     Baza nie odpowiada — dalsze sprawdzenia pomijam.")
            self._podsumuj(bledy)
            return

        # 3. Migracje. `executor` pyta bazę, których migracji brakuje.
        try:
            executor = MigrationExecutor(connection)
            niezastosowane = [
                f"{mig.app_label}.{mig.name}"
                for mig in executor.loader.graph.leaf_nodes()
                if mig not in {target for target in executor.loader.applied_migrations}
            ]
            if niezastosowane:
                bledy.append(f"Niezastosowane migracje: {', '.join(niezastosowane)}")
            else:
                self.stdout.write(self.style.SUCCESS("OK   Wszystkie migracje zastosowane"))
        except Exception as exc:  # noqa: BLE001
            bledy.append(f"Nie mogę sprawdzić migracji: {exc}")

        # 4. Odpowiedź Django bez sieci. Klient testowy uderza w host
        # `testserver`, którego nie ma w ALLOWED_HOSTS produkcji — Django
        # zwraca wtedy 400, choć API żyje. Bierzemy prawdziwy host.
        try:
            from django.test import Client

            host = next((item for item in settings.ALLOWED_HOSTS if item and item != "*"), "testserver")
            odp = Client().get("/v1/health", HTTP_HOST=host)
            if odp.status_code == 200:
                self.stdout.write(self.style.SUCCESS("OK   Blueprint odpowiada na /v1/health"))
            else:
                bledy.append(f"/v1/health zwróciło {odp.status_code}")
        except Exception as exc:  # noqa: BLE001
            bledy.append(f"Blueprint nie odpowiada: {exc}")

        self._podsumuj(bledy)

    def _podsumuj(self, bledy: list[str]) -> None:
        self.stdout.write("")
        if bledy:
            self.stdout.write(self.style.ERROR(f"Błędy: {len(bledy)}"))
            for blad in bledy:
                self.stdout.write(self.style.ERROR(f"  - {blad}"))
            self.stdout.write("")
            self.stdout.write("Czego ta komenda NIE sprawdza:")
            self.stdout.write("  - Redisa ani warstwy kanałów (to logi usługi realtime)")
            self.stdout.write("  - certyfikatu i przekierowania HTTP->HTTPS (to Caddy)")
            self.stdout.write("  - kanału WebSocket (wymaga przeglądarki)")
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS("Wszystko w porządku."))
        self.stdout.write("")
        self.stdout.write("Czego ta komenda NIE sprawdza:")
        self.stdout.write("  - Redisa ani warstwy kanałów (to logi usługi realtime)")
        self.stdout.write("  - certyfikatu i przekierowania HTTP->HTTPS (to Caddy)")
        self.stdout.write("  - kanału WebSocket (wymaga przeglądarki)")
