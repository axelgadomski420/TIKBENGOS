"""Test dymny API — `python manage.py sprawdz`.

CI uruchamia właśnie tę komendę. Bez niej zadanie „Test dymny aplikacji”
kończyłoby się na komendzie, której Django nie zna, a błąd wyglądałby jak
awaria maszyny, nie jak brakujący plik.

Komenda używa klienta testowego Django, więc nie wymaga działającego serwera
i nie dotyka sieci.

POPRAWKA: klient testowy domyślnie uderza pod host `testserver`, którego nie ma
w `ALLOWED_HOSTS` wdrożenia produkcyjnego — Django odpowiadał 400 i wyglądało
to na awarię API, choć API działało. Ustawiamy nagłówek `Host` na pierwszy wpis
z `ALLOWED_HOSTS`, żeby test sprawdzał aplikację, a nie konfigurację hosta.

Czego NIE sprawdza: kanału WebSocket (wymaga klienta ASGI, nie zrobi tego
klient HTTP) i wyglądu interfejsu.
"""

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.models import User


def allowed_host() -> str:
    """Pierwszy host z `ALLOWED_HOSTS` albo `testserver` w środowisku lokalnym."""
    hosts = [h for h in settings.ALLOWED_HOSTS if h and h != "*"]
    return hosts[0] if hosts else "testserver"


class Command(BaseCommand):
    help = "Sprawdza, że API odpowiada i że podstawowe drogi działają."

    def handle(self, *args, **options):
        from django.test import Client

        host = allowed_host()
        client = Client(headers={"host": host})
        bledy = []

        self.stdout.write(f"Host testu: {host}")

        odpowiedz = client.get("/v1/health")
        if odpowiedz.status_code != 200 or odpowiedz.json().get("status") != "ok":
            bledy.append(f"/v1/health zwróciło {odpowiedz.status_code}")
        else:
            self.stdout.write(self.style.SUCCESS("[OK] /v1/health"))

        odpowiedz = client.get("/v1/csrf")
        token = odpowiedz.json().get("csrfToken") if odpowiedz.status_code == 200 else ""
        if not token:
            bledy.append("/v1/csrf nie wydało tokenu")
        else:
            self.stdout.write(self.style.SUCCESS("[OK] /v1/csrf wydaje token"))

        odpowiedz = client.post(
            "/v1/auth/register",
            data={
                "username": "sprawdzenie",
                "email": "sprawdzenie@example.com",
                "password": "haslo-bardzo-dlugie-123",
            },
            content_type="application/json",
        )
        if odpowiedz.status_code not in (201, 409):
            bledy.append(f"rejestracja zwróciła {odpowiedz.status_code}")
        else:
            self.stdout.write(self.style.SUCCESS("[OK] rejestracja"))

        odpowiedz = client.get("/v1/feed/posts")
        if odpowiedz.status_code != 200 or "items" not in odpowiedz.json():
            bledy.append(f"/v1/feed/posts zwróciło {odpowiedz.status_code}")
        else:
            self.stdout.write(self.style.SUCCESS("[OK] /v1/feed/posts"))

        # Zapis wpisu wymaga uprawnienia, więc tworzymy konto twórcy
        # bezpośrednio w bazie i logujemy się nim w kliencie testowym.
        tworca = User.objects.filter(username="sprawdzenie-tworca").first()
        if tworca is None:
            tworca = User.objects.create_user(
                username="sprawdzenie-tworca",
                email="sprawdzenie-tworca@example.com",
                password="haslo-bardzo-dlugie-123",
                roles=["creator"],
            )
        client.force_login(tworca)
        odpowiedz = client.post(
            "/v1/feed/posts",
            data={"body": "wpis z testu dymnego"},
            content_type="application/json",
        )
        if odpowiedz.status_code != 201:
            bledy.append(f"zapis wpisu zwrócił {odpowiedz.status_code}")
        else:
            self.stdout.write(self.style.SUCCESS("[OK] zapis wpisu"))

        if bledy:
            for blad in bledy:
                self.stderr.write(self.style.ERROR(f"[BŁĄD] {blad}"))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS("Wszystkie sprawdzenia przeszły."))
