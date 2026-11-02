"""Migracja: kolumna `perception` na modelu użytkownika.

Dlaczego osobna migracja, a nie dopisanie do `0001_initial`: `0001_initial`
opisuje stan, w którym pole powstało, a ten plik opisuje ZMIANĘ. Gdyby ktoś
już uruchomił `migrate` na wcześniejszej wersji, zmiana w `0001` nie
doszłaby do jego bazy — Django zapisuje w tabeli `django_migrations` tylko
to, że migracja się wykonała, a nie jej treść.

UWAGA: jeśli w Twojej bazie `perception` JUŻ JEST (bo `0001_initial` zostało
poprawione po pierwszym uruchomieniu), ta migracja padnie z błędem
„column already exists”. Wtedy nie dodawaj jej ręcznie — powiedz, a przygotuję
wersję, która sprawdza stan kolumny przed zmianą.
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_providercredential")]

    operations = [
        migrations.RunSQL(
            sql=(
                "ALTER TABLE accounts_user "
                "ADD COLUMN IF NOT EXISTS perception varchar(16) "
                "NOT NULL DEFAULT 'both'"
            ),
            reverse_sql="ALTER TABLE accounts_user DROP COLUMN IF EXISTS perception",
        ),
    ]
