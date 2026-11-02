"""Migracja początkowa tożsamości.

Napisana ręcznie, a nie wygenerowana: repozytorium ma działać po `migrate`
bez wcześniejszego uruchamiania `makemigrations` na maszynie, która ma
połączenie z bazą. To jedyna migracja w tym etapie.
"""

import uuid

import django.contrib.auth.models
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [("auth", "0012_alter_user_first_name_max_length")]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                (
                    "is_superuser",
                    models.BooleanField(
                        default=False,
                        help_text="Designates that this user has all permissions without explicitly assigning them.",
                        verbose_name="superuser status",
                    ),
                ),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("username", models.CharField(max_length=150, unique=True)),
                ("first_name", models.CharField(blank=True, max_length=150)),
                ("last_name", models.CharField(blank=True, max_length=150)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("date_joined", models.DateTimeField(default=django.utils.timezone.now)),
                ("display_name", models.CharField(blank=True, default="", max_length=80)),
                ("avatar_url", models.URLField(blank=True, default="")),
                ("bio", models.TextField(blank=True, default="")),
                ("website", models.URLField(blank=True, default="")),
                ("roles", models.JSONField(blank=True, default=list)),
                (
                    "perception",
                    models.CharField(
                        choices=[("both", "Obraz i dźwięk"), ("audio-only", "Tylko dźwięk"), ("text-only", "Tylko tekst")],
                        default="both",
                        max_length=16,
                    ),
                ),
                ("consent_camera", models.BooleanField(default=False)),
                ("consent_microphone", models.BooleanField(default=False)),
                ("consent_github", models.BooleanField(default=False)),
                ("consent_push_notifications", models.BooleanField(default=False)),
                ("consents_updated_at", models.DateTimeField(blank=True, null=True)),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.permission",
                        verbose_name="user permissions",
                    ),
                ),
            ],
            options={"verbose_name": "user", "verbose_name_plural": "users", "abstract": False},
            managers=[("objects", django.contrib.auth.models.UserManager())],
        ),
        migrations.CreateModel(
            name="ApiKey",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=64)),
                ("lookup_hash", models.CharField(db_index=True, max_length=64, unique=True)),
                ("secret_encrypted", models.TextField()),
                ("prefix", models.CharField(max_length=16)),
                ("last_four", models.CharField(max_length=4)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="api_keys",
                        to="accounts.user",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(max_length=64)),
                ("resource", models.CharField(blank=True, default="", max_length=128)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_entries",
                        to="accounts.user",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["user", "-created_at"], name="accounts_au_user_id_6d1b5f_idx"),
        ),
    ]
