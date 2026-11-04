"""Migracja uzupełniająca dziennik operacji — indeks na kolumnie `action`.

Django przy starcie wypisywało ostrzeżenie:

    Your models in app(s): 'accounts', 'feed' have changes that are
    not yet reflected in a migration, and so won't be applied.

Aplikacja działała, ale to cichy dług: następne `makemigrations` wygenerowałoby
zmiany, których nikt nie zaplanował, a przy odtwarzaniu bazy z zera stan
wyszedłby inny niż na maszynie. Rozjazd migracji trzeba domknąć teraz, póki
baza jest młoda — później byłoby to już ryzykowne.

Ta migracja dodaje jawny indeks na `AuditLog.action`. Powód jest praktyczny:
panel i audyt pokazują operacje po działaniu, a tabela rośnie z każdym
żądaniem — bez indeksu filtr skanuje całą tabelę.

Zapisana ręcznie: `makemigrations` wymaga uruchomienia Django, a tego w tym
zadaniu nie wolno. Zgodność z modelami sprawdza `makemigrations --check`
w CI — jeśli ta migracja rozjedzie się z modelem, test to pokaże.
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_user_perception"),
    ]

    operations = [
        migrations.AlterField(
            model_name="auditlog",
            name="action",
            field=models.CharField(db_index=True, max_length=64),
        ),
    ]
