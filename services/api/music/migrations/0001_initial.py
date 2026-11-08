"""Migracja początkowa muzyki.

Pisana ręcznie — zasada projektu: migracje są ręczne i tylko DODAJĄCE.
Styl pól zgodny z chat/migrations/0001_initial.py.
"""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import music.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Track",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=200)),
                ("prompt", models.TextField(blank=True, default="")),
                ("model", models.CharField(choices=[("musicgen-small", "MusicGen small"), ("musicgen-medium", "MusicGen medium (GPU 16 GB)"), ("musicgen-melody", "MusicGen melody (GPU 16 GB)"), ("jasco", "JASCO (GPU)"), ("webaudio-sequencer", "Sekwencer BENGOS Beat (przeglądarka)")], max_length=30)),
                ("duration_seconds", models.FloatField(default=0)),
                ("audio", models.FileField(blank=True, null=True, upload_to="music/%Y/%m/")),
                ("content_type", models.CharField(blank=True, default="", max_length=100)),
                ("licence", models.JSONField(default=music.models.default_licence)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="music_tracks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="GenerationJob",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("kind", models.CharField(default="music.generate", max_length=30)),
                ("state", models.CharField(choices=[("queued", "W kolejce"), ("running", "Generowanie"), ("succeeded", "Gotowe"), ("failed", "Nieudane"), ("cancelled", "Anulowane")], default="queued", max_length=12)),
                ("stage", models.CharField(blank=True, default="", max_length=120)),
                ("progress", models.FloatField(default=0)),
                ("error", models.JSONField(blank=True, null=True)),
                ("result_ref", models.CharField(blank=True, default="", max_length=400)),
                ("prompt", models.TextField(blank=True, default="")),
                ("model", models.CharField(default="musicgen-small", max_length=30)),
                ("duration_seconds", models.FloatField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="music_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
