"""Klient GitHub REST API dla modułu Dev.

Celowo stdlib (urllib), nie requests: API ma JEDEN zewnętrzny klient,
a requirements.txt pozostaje krótki i audytowalny. Każde żądanie wychodzi
z tokenem z ustawień GITHUB_TOKEN — nigdy z czymś wpisanym na sztywno.

Token jest jeden na instalację (serwerowy), a nie per użytkownik: to
decyzja Etapu 5, nie przeoczenie. Aplikacja GitHub (OAuth per użytkownik)
dojdzie z uprawnieniami instalacji; dzisiaj moduł ma działać uczciwie
z jednym tokenem o najmniejszych potrzebnych prawach, a listę praw
WYKRYWA z odpowiedzi GitHuba zamiast zgadywać.
"""

import json
import urllib.error
import urllib.request
from django.conf import settings

API_BASE = "https://api.github.com"
TIMEOUT_SECONDS = 15
COMMITS_PAGE = 10


class GitHubUnavailable(Exception):
    """Błąd rozmowy z GitHub API — niesie kod HTTP i LUDZKI komunikat.

    Kod jest potrzebny endpointom: 404 z GitHuba to "nie znaleziono
    repozytorium", 401 to "token odrzucony", a nie generyczne 500.
    """

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _request(method: str, path: str, payload: dict | None = None) -> dict | list:
    token = getattr(settings, "GITHUB_TOKEN", "")
    if not token:
        raise GitHubUnavailable(
            503,
            "Token GitHub nie jest skonfigurowany. Ustaw GITHUB_TOKEN "
            "w środowisku API — bez niego moduł Dev mówi to wprost "
            "i nie udaje działającego połączenia.",
        )

    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        API_BASE + path,
        data=data,
        method=method,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            # GitHub odrzuca żądania bez User-Agent — dosłownie, kodem 403.
            "User-Agent": "TIKBENGOS-Dev",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = json.loads(exc.read().decode("utf-8") or "{}").get("message", "")
        except (ValueError, OSError):
            detail = ""
        if exc.code == 401:
            raise GitHubUnavailable(401, "GitHub odrzucił token (401). Sprawdź GITHUB_TOKEN.") from exc
        if exc.code == 403:
            raise GitHubUnavailable(
                403, "Token nie ma praw do tej operacji (403). " + detail
            ) from exc
        if exc.code == 404:
            raise GitHubUnavailable(404, "Nie znaleziono tego repozytorium (404).") from exc
        if exc.code == 409:
            raise GitHubUnavailable(409, "GitHub zgłosił konflikt (409). " + detail) from exc
        raise GitHubUnavailable(502, "GitHub odpowiedział błędem " + str(exc.code) + ". " + detail) from exc
    except urllib.error.URLError as exc:
        raise GitHubUnavailable(503, "Nie można połączyć się z GitHub API. " + str(exc.reason)) from exc


def fetch_repo(owner: str, name: str) -> dict:
    return _request("GET", "/repos/" + owner + "/" + name)


def list_issues(owner: str, name: str, state: str) -> list:
    return _request("GET", "/repos/" + owner + "/" + name + "/issues?state=" + state + "&per_page=30")


def create_issue(owner: str, name: str, title: str, body: str, labels: list) -> dict:
    return _request(
        "POST",
        "/repos/" + owner + "/" + name + "/issues",
        {"title": title, "body": body, "labels": labels},
    )


def add_comment(owner: str, name: str, number: int, body: str) -> dict:
    return _request(
        "POST",
        "/repos/" + owner + "/" + name + "/issues/" + str(number) + "/comments",
        {"body": body},
    )


def set_issue_state(owner: str, name: str, number: int, state: str) -> dict:
    return _request(
        "PATCH",
        "/repos/" + owner + "/" + name + "/issues/" + str(number),
        {"state": state},
    )


def list_commits(owner: str, name: str) -> list:
    return _request("GET", "/repos/" + owner + "/" + name + "/commits?per_page=" + str(COMMITS_PAGE))


# ── Tłumaczenia odpowiedzi GitHuba na kontrakt ─────────────────────────
# Te funkcje są JEDYNYM miejscem, w którym widać surowe pole GitHuba.
# Cała reszta modułu dostaje już kształt z packages/core/src/projects.ts.


def repo_permissions(gh_repo: dict) -> dict:
    """Uprawnienia wykryte z odpowiedzi GitHuba, nie zgadywane.

    Pole "permissions" pojawia się w odpowiedzi tylko dla zalogowanego
    tokenu i mówi PRAWDĘ o tym, co token może. Wyświetlamy je w interfejsie
    zamiast zakładać, że "token na pewno coś może".
    """
    perms = gh_repo.get("permissions") or {}
    can_push = bool(perms.get("push"))
    can_pull = bool(perms.get("pull", True))
    return {
        "readContents": True,
        "writeContents": can_push,
        "openPullRequests": can_push,
        "readIssues": can_pull,
        "writeIssues": can_push,
    }


def issue_out(gh_issue: dict) -> dict:
    user = gh_issue.get("user") or {}
    # GitHub zwraca też pull requesty w liście issue — one nie są issue
    # i nie mają tu czego szukać.
    if "pull_request" in gh_issue:
        return {}
    return {
        "id": str(gh_issue.get("id", "")),
        "number": gh_issue.get("number", 0),
        "title": gh_issue.get("title", ""),
        "body": gh_issue.get("body") or "",
        "state": gh_issue.get("state", "open"),
        "authorLogin": user.get("login", ""),
        "labels": [label.get("name", "") for label in gh_issue.get("labels", [])],
        "createdAt": gh_issue.get("created_at"),
    }


def comment_out(gh_comment: dict) -> dict:
    return {
        "id": str(gh_comment.get("id", "")),
        "htmlUrl": gh_comment.get("html_url", ""),
        "createdAt": gh_comment.get("created_at"),
    }


def commit_out(gh_commit: dict) -> dict:
    inner = gh_commit.get("commit") or {}
    author = inner.get("author") or {}
    return {
        "sha": gh_commit.get("sha", ""),
        "message": author and inner.get("message", "") or "",
        "authorName": author.get("name", ""),
        "createdAt": author.get("date"),
        "url": gh_commit.get("html_url", ""),
    }
