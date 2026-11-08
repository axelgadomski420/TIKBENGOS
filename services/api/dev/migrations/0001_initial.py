"""Migracja początkowa modułu Dev.

Pisana ręcznie — zasada projektu: migracje są ręczne i tylko DODAJĄCE.
Styl pól zgodny z chat/migrations/0001_initial.py, który przeszedł
migrate na czystej bazie.
"""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ConnectedRepository",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("github_owner", models.CharField(max_length=100)),
                ("github_name", models.CharField(max_length=200)),
                ("default_branch", models.CharField(default="main", max_length=200)),
                ("is_private", models.BooleanField(default=False)),
                ("write_contents", models.BooleanField(default=False)),
                ("open_pull_requests", models.BooleanField(default=False)),
                ("read_issues", models.BooleanField(default=True)),
                ("write_issues", models.BooleanField(default=False)),
                ("connected_at", models.DateTimeField(auto_now_add=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dev_repositories",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-connected_at"]},
        ),
        migrations.CreateModel(
            name="ChangePlan",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("request", models.TextField()),
                ("summary", models.TextField(blank=True, default="")),
                ("steps", models.JSONField(blank=True, default=list)),
                ("files_touched", models.JSONField(blank=True, default=list)),
                ("state", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "repository",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="plans",
                        to="dev.connectedrepository",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="CodeJob",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("state", models.CharField(choices=[("queued", "W kolejce"), ("running", "Wykonywane"), ("succeeded", "Gotowe"), ("failed", "Nieudane")], default="queued", max_length=12)),
                ("stage", models.CharField(blank=True, default="", max_length=120)),
                ("progress", models.FloatField(default=0)),
                ("error", models.JSONField(blank=True, null=True)),
                ("result_ref", models.CharField(blank=True, default="", max_length=400)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dev_code_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "plan",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="jobs",
                        to="dev.changeplan",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="CodeOperation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("operation", models.CharField(max_length=40)),
                ("detail", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dev_operations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "plan",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="operations",
                        to="dev.changeplan",
                    ),
                ),
                (
                    "repository",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="operations",
                        to="dev.connectedrepository",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="connectedrepository",
            constraint=models.UniqueConstraint(
                fields=("owner", "github_owner", "github_name"),
                name="unique_repository_per_user",
            ),
        ),
    ]
