"""Migracja scalająca liście feedu — domyka graf migracji.

── PO CO TA MIGRACJA ──────────────────────────────────────────────────
Django odmawiało startu komunikatem:

    CommandError: Conflicting migrations detected; multiple leaf nodes
    in the migration graph: (0002_comments, 0002_feed_indices in feed; ...)

Powód: dwie migracje o tym samym numerze (`0002_comments`
 i `0002_feed_indices`) są zależne bezpośrednio od `0001_initial`,
więc obie są liśćmi grafu. Django wymaga dokładnie jednego liścia
i bez tego nie uruchomi ani `migrate`, ani serwera — kontener `api`
wchodził w pętlę restartów.

── CO TA MIGRACJA ROBI, A CZEGO NIE ───────────────────────────────────
`operations` jest PUSTE i takie ma zostać. Nie dotyka schematu, nie
tworzy tabeli, nie zmienia kolumny — jedynie łączy dwa rozjazdy w jeden
koniec grafu. To jest dokładnie to, co generuje
`makemigrations --merge`, zapisane ręcznie, bo `makemigrations` wymaga
uruchomienia Django, a migracje w tym projekcie są pisane ręcznie.

Baza z Etapu 1 przechodzi ją bez utraty czegokolwiek: żadna operacja
nie jest wykonywana na danych ani na strukturze.

── CZEGO NIE ROBIĘ TU INACZEJ ─────────────────────────────────────────
Nie przenoszę operacji z obu migracji do jednej, bo to wymagałoby
usunięcia lub nadpisania istniejących plików. Brief tego zabrania:
migracja jest nowa, dodająca i nie zmienia ani jednego bajtu w tym,
co już leży na produkcji.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("feed", "0002_comments"),
        ("feed", "0002_feed_indices"),
    ]

    # Celowo puste. Ta migracja ma tylko domknąć graf, a nie zmieniać model.
    operations = []
