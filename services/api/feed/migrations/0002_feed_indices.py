"""Migracja druga feedu — nazwane indeksy.

Po co osobno: nazwane indeksy usuwają zależność od nazw generowanych
automatycznie. Przy odtwarzaniu bazy z zera nazwa „wygodna” dla jednego
silnika potrafi nie istnieć w drugim, a wtedy migracja staje — i to nie
w momencie, w którym można to zauważyć, tylko przy pierwszym wdrożeniu.

Oba indeksy obsługują filtr „obserwowani”: zapytanie idzie po autorze,
a nie po samym identyfikatorze.
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("feed", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="post",
            index=models.Index(fields=["author", "-created_at"], name="feed_post_author_created_idx"),
        ),
        migrations.AddIndex(
            model_name="post",
            index=models.Index(fields=["reposted_by", "-created_at"], name="feed_post_reposter_created_idx"),
        ),
    ]
