"""Kształty Dev — te same nazwy pól co packages/core/src/projects.ts."""

from datetime import datetime
from typing import Any

from ninja import Schema


class PermissionsOut(Schema):
    readContents: bool
    writeContents: bool
    openPullRequests: bool
    readIssues: bool
    writeIssues: bool


class RepositoryOut(Schema):
    id: str
    owner: str
    name: str
    defaultBranch: str
    isPrivate: bool
    permissions: PermissionsOut
    connectedAt: datetime


class RepositoryListOut(Schema):
    items: list[RepositoryOut]


class ConnectRepositoryIn(Schema):
    owner: str
    name: str


class ConnectRepositoryOut(Schema):
    repository: RepositoryOut
    installationUrl: str


class IssueOut(Schema):
    id: str
    number: int
    title: str
    body: str
    state: str
    authorLogin: str
    labels: list[str]
    createdAt: datetime


class IssueListOut(Schema):
    items: list[IssueOut]


class CreateIssueIn(Schema):
    title: str
    body: str = ""
    labels: list[str] = []


class CommentIn(Schema):
    body: str


class IssueCommentOut(Schema):
    id: str
    htmlUrl: str
    createdAt: datetime


class CommitOut(Schema):
    sha: str
    message: str
    authorName: str
    createdAt: datetime
    url: str


class CommitListOut(Schema):
    items: list[CommitOut]


class PlanStepOut(Schema):
    id: str
    description: str
    status: str
    output: str | None


class PlanOut(Schema):
    id: str
    repositoryId: str
    request: str
    summary: str
    steps: list[PlanStepOut]
    filesTouched: list[str]
    # Unia PlanState z kontraktu — serializowana jako słownik z kluczem
    # "state", dokładnie tak jak wygląda w packages/core/src/projects.ts.
    state: dict[str, Any]
    createdAt: datetime


class PlanListOut(Schema):
    items: list[PlanOut]


class CreatePlanIn(Schema):
    # Dokladnie pola, ktore czyta create_plan w api.py: repozytorium z listy
    # polaczen uzytkownika i opis funkcji. Ksztalt z kontraktu projects.ts.
    repositoryId: str
    request: str


class ApprovePlanIn(Schema):
    # Pole z kontraktu: zatwierdzenie musi być świadome. Bez DOKŁADNIE
    # tej wartości serwer odmawia — "kliknąłem coś" nie jest zgodą na
    # gałąź, commit i pull request.
    confirm: str


class RejectPlanIn(Schema):
    reason: str | None = None


class OperationOut(Schema):
    id: str
    planId: str | None
    actorId: str
    operation: str
    repositoryId: str | None
    detail: str
    createdAt: datetime


class OperationListOut(Schema):
    items: list[OperationOut]

class JobCompleteIn(Schema):
    """Raport executora zmian — dokładnie to, co oddaje services/executor.

    Pola są opcjonalne poza state: raport "running" niesie tylko postęp,
    a "succeeded" streszczenie, kroki, pliki i adres pull requesta.
    Kroki są słownikami (nie schematem), bo kształt PlanStep z kontraktu
    waliduje PlanOut przy odczycie — tu przyjmujemy je z zaufania do
    workera z sekretem i zapisujemy.
    """

    state: str
    stage: str = ""
    progress: float = 0
    summary: str = ""
    steps: list[dict[str, Any]] = []
    filesTouched: list[str] = []
    pullRequestUrl: str = ""
    error: str = ""
