"""Testy modułu Dev — bez sieci, z podmienionym klientem GitHuba.

Zasada: testy NIE mogą rozmawiać z prawdziwym GitHubem — nie dlatego,
że sieć jest droga, ale dlatego, że test zależny od cudzego serwera
przestaje być testem w chwili, gdy serwer ma awarię. Klient github.py
jest modułem, więc monkeypatch na jego funkcjach widzi API.
"""

import uuid

from django.test import TestCase
from django.urls import reverse

from accounts.models import User

from . import github as gh
from .models import ChangePlan, CodeOperation, ConnectedRepository


def _fake_repo(push: bool = True) -> dict:
    return {
        "html_url": "https://github.com/example/demo",
        "default_branch": "main",
        "private": False,
        "permissions": {"admin": push, "push": push, "pull": True},
    }


def _fake_issue(number: int = 7) -> dict:
    return {
        "id": 1000 + number,
        "number": number,
        "title": "Poprawka",
        "body": "Treść",
        "state": "open",
        "user": {"login": "ktos"},
        "labels": [{"name": "bug"}],
        "created_at": "2026-01-01T12:00:00Z",
    }


class DevTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ada", email="ada@example.com", password="haslo-ma-dlugie-12")
        self.client.force_login(self.user)

    def test_endpoints_wymagaja_sesji(self):
        response = self.client.get(reverse("v1:list_repositories"))
        self.assertEqual(response.status_code, 401)

    def test_polaczenie_repozytorium(self):
        seen = {}

        def fake_fetch(owner, name):
            seen["full"] = owner + "/" + name
            return _fake_repo()

        with self.settings(GITHUB_TOKEN="token-testowy"):
            self.client.patch  # no-op, żeby monkeypatch widział settings
            import unittest.mock as mock

            with mock.patch.object(gh, "fetch_repo", fake_fetch):
                response = self.client.post(
                    reverse("v1:connect_repository"),
                    data='{"owner": "example", "name": "demo"}',
                    content_type="application/json",
                )
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body["repository"]["owner"], "example")
        # Uprawnienia WYKRYTE z GitHuba, nie zgadywane:
        self.assertTrue(body["repository"]["permissions"]["writeContents"])
        self.assertEqual(seen["full"], "example/demo")
        self.assertTrue(
            CodeOperation.objects.filter(operation="repository.connect").exists()
        )

    def test_polaczenie_duplikat_409(self):
        ConnectedRepository.objects.create(
            owner=self.user, github_owner="example", github_name="demo"
        )
        response = self.client.post(
            reverse("v1:connect_repository"),
            data='{"owner": "example", "name": "demo"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 409)

    def test_bez_tokenu_503_ucciwie(self):
        response = self.client.post(
            reverse("v1:connect_repository"),
            data='{"owner": "example", "name": "demo"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("Token GitHub nie jest skonfigurowany", response.json()["message"])

    def test_issue_listowane_i_zakladane(self):
        repository = ConnectedRepository.objects.create(
            owner=self.user,
            github_owner="example",
            github_name="demo",
            write_issues=True,
            read_issues=True,
        )
        import unittest.mock as mock

        with mock.patch.object(gh, "list_issues", lambda o, n, s: [_fake_issue(3), {"pull_request": {}}]):
            response = self.client.get(
                reverse("v1:list_issues", kwargs={"repository_id": str(repository.id)})
            )
        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        # Pull requesty z listy issue NIE są issue:
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["number"], 3)

        created = {}

        def fake_create(owner, name, title, body, labels):
            created.update({"title": title, "labels": labels})
            return _fake_issue(9)

        with mock.patch.object(gh, "create_issue", fake_create):
            response = self.client.post(
                reverse("v1:create_issue", kwargs={"repository_id": str(repository.id)}),
                data='{"title": "Nowe", "body": "Opis", "labels": ["bug"]}',
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(created["labels"], ["bug"])
        self.assertTrue(CodeOperation.objects.filter(operation="issue.create").exists())

    def test_issue_zakladany_bez_uprawnien_403(self):
        repository = ConnectedRepository.objects.create(
            owner=self.user, github_owner="example", github_name="demo", write_issues=False
        )
        response = self.client.post(
            reverse("v1:create_issue", kwargs={"repository_id": str(repository.id)}),
            data='{"title": "Nowe"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_plan_utworzenie_odrzucenie_zatwierdzenie(self):
        repository = ConnectedRepository.objects.create(
            owner=self.user, github_owner="example", github_name="demo"
        )
        response = self.client.post(
            reverse("v1:create_plan"),
            data={"repositoryId": str(repository.id), "request": "Dodaj eksport feedu do CSV."},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        plan_id = response.json()["id"]
        self.assertEqual(response.json()["state"]["state"], "awaiting-approval")

        # Zatwierdzenie bez świadomego confirm — odmowa:
        response = self.client.post(
            reverse("v1:approve_plan", kwargs={"plan_id": plan_id}),
            data='{"confirm": "no-dzieki"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

        # Zatwierdzenie bez executora — 409 z wyjaśnieniem, plan nietknięty:
        response = self.client.post(
            reverse("v1:approve_plan", kwargs={"plan_id": plan_id}),
            data='{"confirm": "create-branch-and-pull-request"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn("Executor", response.json()["message"])
        self.assertEqual(ChangePlan.objects.get(id=plan_id).state["state"], "awaiting-approval")

        response = self.client.post(
            reverse("v1:reject_plan", kwargs={"plan_id": plan_id}),
            data='{"reason": "Za kosztowne"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["state"]["state"], "rejected")
        self.assertEqual(response.json()["state"]["reason"], "Za kosztowne")
        self.assertTrue(CodeOperation.objects.filter(operation="plan.reject").exists())

    def test_operacje_widoczne_tylko_wlasciciela(self):
        other = User.objects.create_user(username="bob", email="bob@example.com", password="haslo-ma-dlugie-12")
        repository = ConnectedRepository.objects.create(
            owner=self.user, github_owner="example", github_name="demo"
        )
        CodeOperation.objects.create(actor=other, operation="read", detail="cudze")
        CodeOperation.objects.create(
            actor=self.user, operation="read", detail="moje", repository=repository
        )
        response = self.client.get(reverse("v1:list_operations"))
        self.assertEqual(response.status_code, 200)
        details = [item["detail"] for item in response.json()["items"]]
        self.assertIn("moje", details)
        self.assertNotIn("cudze", details)
