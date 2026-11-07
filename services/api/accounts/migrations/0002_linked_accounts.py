"""Migracja kont zewnętrznych — Etap 2.

Zapisana ręcznie z tego samego powodu co migracje feedu: `makemigrations`
wymaga uruchomienia Django, a w tym zadaniu nie wolno uruchamiać niczego.

Migracja jest DODAJĄCA i taka ma zostać: jedna operacja `CreateModel`,
zero `RemoveField`, zero `DeleteModel`, zero zmian w modelu `User`. Konto
z Etapu 1 przechodzi ją bez utraty czegokolwiek — użytkownik z hasłem nadal
loguje się hasłem, zyskuje tylko możliwość podpięcia dostawcy.

Dwie ograniczenia unikalności są tu potrzebne, a nie ozdobne:

- `unique_linked_provider_subject` — jeden wiersz na parę (dostawca, subject).
  Bez tego dwa równoległe żądania callbacku mogłyby założyć dwa konta dla tej
  samej osoby, bo oba sprawdziłyby bazę przed zapisem pierwszego.
- `unique_linked_provider_per_user` — ten sam dostawca nie może być podpięty
  dwa razy do jednego konta.
"""

import uuid

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="LinkedAccount",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(choices=[("google", "google"), ("github", "github")], max_length=32)),
                ("subject", models.CharField(max_length=191)),
                ("email", models.EmailField(blank=True, default="")),
                ("display_name", models.CharField(blank=True, default="", max_length=150)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("last_login_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="linked_accounts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["provider"]},
        ),
        migrations.AddConstraint(
            model_name="linkedaccount",
            constraint=models.UniqueConstraint(
                fields=("provider", "subject"), name="unique_linked_provider_subject"
            ),
        ),
        migrations.AddConstraint(
            model_name="linkedaccount",
            constraint=models.UniqueConstraint(
                fields=("user", "provider"), name="unique_linked_provider_per_user"
            ),
        ),
    ]
