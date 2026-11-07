"""Migracja komentarzy feedu — Etap 2.

Zapisana ręcznie z tego samego powodu co `0001_initial`: `makemigrations`
wymaga uruchomienia Django, a w tym zadaniu nie wolno uruchamiać niczego.

Migracja jest DODAJĄCA i taka ma zostać: dwie operacje, zero `RemoveField`
i zero `DeleteModel`. Ścieżka wdrożenia zakłada, że baza z Etapu 1 przejdzie
tę migrację bez utraty danych — jeśli kiedyś trzeba będzie cofnąć model
komentarza, to osobną migracją, a nie przez nadpisanie tej.

`comment_count` na wpisie istniał już w `0001_initial`, więc migracja go
nie tworzy. nie robi też `data migration`: licznik startuje z zera i jest
zwiększany przez API przy każdym nowym komentarzu — policzenie go wstecz
nie ma sensu, bo komentarzy w bazie jeszcze nie ma.
"""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("feed", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Comment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("body", models.CharField(max_length=500)),
                ("like_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "parent_comment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="replies",
                        to="feed.comment",
                    ),
                ),
                (
                    "post",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="feed.post",
                    ),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.AddIndex(
            model_name="comment",
            index=models.Index(fields=["post", "created_at"], name="feed_comment_post_created_idx"),
        ),
    ]
