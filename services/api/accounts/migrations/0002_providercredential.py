"""Migracja: klucze dostawców zewnętrznych.

Dopisana ręcznie, tak jak `0001_initial` — repozytorium ma działać po
`migrate`, bez wcześniejszego uruchamiania `makemigrations` na maszynie
z połączeniem do bazy.

Zależność od `0001_initial` jest konieczna, bo `user` wskazuje na
`accounts.user` — przy braku tej zależności Django ustawiłby migrację
w kolejności przed utworzeniem tabeli użytkownika i `migrate` padłby
na kluczu obcym.
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="ProviderCredential",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider_id", models.CharField(db_index=True, max_length=64)),
                ("name", models.CharField(max_length=64)),
                ("lookup_hash", models.CharField(db_index=True, max_length=64, unique=True)),
                ("secret_encrypted", models.TextField()),
                ("prefix", models.CharField(max_length=32)),
                ("last_four", models.CharField(max_length=4)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="provider_credentials",
                        to="accounts.user",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="providercredential",
            constraint=models.UniqueConstraint(
                fields=("user", "provider_id", "name"),
                name="unique_credential_per_user_provider_name",
            ),
        ),
    ]
