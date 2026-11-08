successfully downloaded text file (SHA: 7b5aca50ff316688cfa8aadb619abe785ae041f4)"""Ręczna migracja początkowa asystenta — addytywna, jak każe zasada.

Powstaje RĘCZNIE (nigdy makemigrations), bo migracje w tym projekcie są
częścią kontraktu bazy: kolejność i kształt mają być czytelne dla człowieka.
Tabela jednej aplikacji, zależna tylko od kont użytkowników.
"""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        # Wzorzec z dev/migrations/0001_initial.py: zależność od modelu
        # użytkownika przez swappable_dependency, a nie od nazwy migracji
        # accounts — nazwa migracji innego modułu to wiedza o jego wnętrzu,
        # której ten moduł nie powinien mieć.
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AssistantJob",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("prompt", models.TextField()),
                ("answer", models.TextField(blank=True, default="")),
                (
                    "state",
                    models.CharField(
                        choices=[
                            ("queued", "W kolejce"),
                            ("running", "Myśli"),
                            ("succeeded", "Gotowe"),
                            ("failed", "Nieudane"),
                            ("cancelled", "Anulowane"),
                        ],
                        default="queued",
                        max_length=12,
                    ),
                ),
                ("stage", models.CharField(blank=True, default="", max_length=120)),
                ("progress", models.FloatField(default=0)),
                ("error", models.JSONField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ai_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
