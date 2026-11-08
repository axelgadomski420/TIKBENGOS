"""Migracja scalająca liście kont — domyka graf migracji.

── PO CO TA MIGRACJA ──────────────────────────────────────────────────
Django odmawiało startu komunikatem:

    CommandError: Conflicting migrations detected; multiple leaf nodes
    in the migration graph: (0002_linked_accounts,
    0004_auditlog_action_index in accounts).

Powód: `0004_auditlog_action_index` zależy od `0003_user_perception`,
ale `0002_providercredential` nie występuje w tej ścieżce — powstają
dwa liście grafu. Django wymaga jednego, więc bez scalenia nie
uruchomi ani `migrate`, ani serwera.

── NIE ZMIENIAM `0004` ANI `0002` ────────────────────────────────────
Innym rozwiązaniem byłoby dopisanie zależności od
`0002_providercredential` w `0004`, ale to modyfikacja istniejącej
migracji — a brief zabrania ruszania istniejących plików, gdy da się
dodać nowy. Dlatego scalenie idzie tu osobną, nową migracją
z pustymi `operations`.

── CO TA MIGRACJA ROBI, A CZEGO NIE ───────────────────────────────────
Nie dotyka schematu, nie tworzy tabeli, nie zmienia kolumny. Łączy dwa
rozjazdy w jeden koniec grafu. Baza z Etapu 1 przechodzi ją bez utraty
czegokolwiek.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_linked_accounts"),
        ("accounts", "0004_auditlog_action_index"),
    ]

    # Celowo puste. Ta migracja ma tylko domknąć graf, a nie zmieniać model.
    operations = []
