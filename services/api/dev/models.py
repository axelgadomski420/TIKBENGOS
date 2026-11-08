"""Dev — połączone repozytoria, plany zmian i dziennik operacji.

Model odpowiada kontraktowi packages/core/src/projects.ts: ConnectedRepository
z uprawnieniami WYKRYTYMI z GitHuba (nie wpisanymi z pamięci), ChangePlan
z pełnym stanem zgody, CodeOperation jako trwały, nieusuwalny wpis.

Zasada z audytu, która urodziła ten moduł: agent kodujący nigdy nie zapisuje
niczego bez zatwierdzenia człowieka. Dlatego plan jest OSOBNYM bytem
z stanem, a nie flagą "zrobione" na żądaniu.
"""

import uuid

from django.conf import settings
from django.db import models

# Z kontraktu i z zasad: tytuł issue ma sens do 200 znaków, treść do 64k
# (limit GitHuba), etykiety do 5. Opis funkcji dla agenta: 4000 znaków.
ISSUE_TITLE_MAX = 200
ISSUE_BODY_MAX = 65536
LABELS_MAX = 5
PLAN_REQUEST_MAX = 4000
OPERATIONS_PAGE = 50
COMMITS_PAGE = 10


class ConnectedRepository(models.Model):
    """Repozytorium podłączone do modułu przez token serwera.

    Pole "permissions" NIE jest kolumną — uprawnienia wykrywamy z GitHuba
    przy połączeniu i zapisujemy jako cztery BOOLe, żeby interfejs
    pokazywał stan prawdziwy na moment połączenia. Przy zmianie uprawnień
    tokenu trzeba połączyć repozytorium ponownie — i o tym interfejs mówi,
    zamiast pokazywać stan nieaktualny.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dev_repositories"
    )
    github_owner = models.CharField(max_length=100)
    github_name = models.CharField(max_length=200)
    default_branch = models.CharField(max_length=200, default="main")
    is_private = models.BooleanField(default=False)
    write_contents = models.BooleanField(default=False)
    open_pull_requests = models.BooleanField(default=False)
    read_issues = models.BooleanField(default=True)
    write_issues = models.BooleanField(default=False)
    connected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-connected_at"]
        constraints = [
            # Jedno połączenie na (użytkownik, repozytorium): drugi wiersz
            # oznaczałby, że interfejs pokazuje repozytorium dwa razy,
            # a "które połączenie jest prawdziwe" nie ma dobrej odpowiedzi.
            models.UniqueConstraint(
                fields=["owner", "github_owner", "github_name"],
                name="unique_repository_per_user",
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return self.github_owner + "/" + self.github_name


class ChangePlan(models.Model):
    """Plan zmian — propozycja, nie zamiar.

    Stan trzymany jest w JSON zamiast kolumn, bo kontrakt mówi o UNII
    PlanState (drafting, awaiting-approval, approved, rejected, applied,
    failed) i dodanie stanu nie może wymagać migracji bazy.

    Kroki i pliki są puste nacreation: dopóki executor (Aider w piaskownicy)
    nie jest podłączony, zmyślona lista kroków byłaby kłamstwem o stanie
    planu. Puste pola mówią prawdę: "plan czeka, nikt go jeszcze nie
    rozpisał".
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repository = models.ForeignKey(
        ConnectedRepository, on_delete=models.CASCADE, related_name="plans"
    )
    request = models.TextField()
    summary = models.TextField(blank=True, default="")
    steps = models.JSONField(default=list, blank=True)
    files_touched = models.JSONField(default=list, blank=True)
    state = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class CodeJob(models.Model):
    """Zadanie wykonania planu — powstaje TYLKO po udanej dyspatszy.

    Bez executora to zadanie nie powstaje wcale. Pusta tabela nie kłamie;
    tabela z tysiącem "queued", których nikt nigdy nie wykona, kłamie
    każdego dnia, gdy użytkownik patrzy na niezmieniający się pasek.
    """

    STATE_CHOICES = [
        ("queued", "W kolejce"),
        ("running", "Wykonywane"),
        ("succeeded", "Gotowe"),
        ("failed", "Nieudane"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dev_code_jobs"
    )
    plan = models.ForeignKey(
        ChangePlan, on_delete=models.SET_NULL, null=True, blank=True, related_name="jobs"
    )
    state = models.CharField(max_length=12, choices=STATE_CHOICES, default="queued")
    stage = models.CharField(max_length=120, blank=True, default="")
    progress = models.FloatField(default=0)
    error = models.JSONField(null=True, blank=True)
    result_ref = models.CharField(max_length=400, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CodeOperation(models.Model):
    """Wpis w dzienniku operacji — trwały i nieusuwalny.

    Każde działanie na cudzym kodzie zostawia ślad: kto, kiedy, co.
    Dziennik NIE ma endpointu usuwania i nie będzie miał — to jest
    trzon zasady z audytu, nie ozdoba modelu.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repository = models.ForeignKey(
        ConnectedRepository,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operations",
    )
    plan = models.ForeignKey(
        ChangePlan, on_delete=models.SET_NULL, null=True, blank=True, related_name="operations"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dev_operations"
    )
    operation = models.CharField(max_length=40)
    detail = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
