"""Testy endpointu zwrotnego executora zmian — bez sieci i bez Aidera.

Executor wykonuje kod w piaskownicy, więc testy sprawdzają KONTRAKT
callbacku: sekret, raport postępu, przejście planu w applied z pull
requestem, porażkę z ludzkim komunikatem. To samo, co sprawdza
przyjmujący raport serwer — dokładnie ta granica.
"""

import uuid

from django.test import TestCase, override_settings
from django.urls import reverse

from accounts.models import User

from .models import ChangePlan, CodeJob, CodeOperation, ConnectedRepository

SEKRET = "sekret-executorowi"


class CompleteJobTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ewa", email="ewa@example.com", password="haslo-ma-dlugie-12")
        self.repository = ConnectedRepository.objects.create(
            owner=self.user,
            github_owner="axelgadomski420",
            github_name="TIKBENGOS",
            write_contents=True,
        )
        self.plan = ChangePlan.objects.create(
            repository=self.repository,
            request="Dodaj endpoint zdrowia",
            state={"state": "approved", "jobId": "stary"},
        )
        self.job = CodeJob.objects.create(owner=self.user, plan=self.plan, state="queued")

    def _post(self, payload, **extra):
        return self.client.post(
            reverse("v1:complete_job", kwargs={"job_id": str(self.job.id)}),
            data=payload,
            content_type="application/json",
            **extra,
        )

    def test_zamkniety_bez_sekretu(self):
        # Bez BENGOS_WORKER_TOKEN endpoint odrzuca KAŻDE żądanie —
        # nawet od prawdziwego executora. Zamknięte, nie „cicho”.
        response = self._post({"state": "running"})
        self.assertEqual(response.status_code, 403)

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_zly_sekret_odrzucony(self):
        response = self._post({"state": "running"}, HTTP_X_BENGOS_WORKER="zly-sekret")
        self.assertEqual(response.status_code, 403)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "queued")

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_raport_postepu(self):
        response = self._post(
            {"state": "running", "stage": "Aider pisze zmiany", "progress": 0.4},
            HTTP_X_BENGOS_WORKER=SEKRET,
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "running")
        self.assertEqual(self.job.stage, "Aider pisze zmiany")

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_sukces_zamyka_plan_i_loguje(self):
        response = self._post(
            {
                "state": "succeeded",
                "summary": "Aider dodał endpoint /health.",
                "steps": [
                    {
                        "id": "krok-1",
                        "description": "Zmiana urls.py",
                        "status": "succeeded",
                        "output": "dodano ścieżkę",
                    }
                ],
                "filesTouched": ["services/api/tikbengos/urls.py"],
                "pullRequestUrl": "https://github.com/axelgadomski420/TIKBENGOS/pull/7",
            },
            HTTP_X_BENGOS_WORKER=SEKRET,
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn("/pull/7", response.json()["resultRef"])

        self.plan.refresh_from_db()
        self.assertEqual(self.plan.state["state"], "applied")
        self.assertEqual(self.plan.state["pullRequestUrl"], "https://github.com/axelgadomski420/TIKBENGOS/pull/7")
        self.assertEqual(self.plan.files_touched, ["services/api/tikbengos/urls.py"])
        self.assertIn("health", self.plan.summary)

        # Dziennik operacji dostał wpis — audyt to trzon modułu.
        self.assertTrue(
            CodeOperation.objects.filter(operation="plan.applied", plan=self.plan).exists()
        )

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_sukces_bez_pull_requesta_odrzucony(self):
        # Sukces bez PR to zmiany, których nikt nie zobaczy — odmowa.
        response = self._post({"state": "succeeded"}, HTTP_X_BENGOS_WORKER=SEKRET)
        self.assertEqual(response.status_code, 400)
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.state["state"], "approved")

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_porazka_oznacza_plan(self):
        response = self._post(
            {"state": "failed", "error": "Aider nie zmienił żadnego pliku."},
            HTTP_X_BENGOS_WORKER=SEKRET,
        )
        self.assertEqual(response.status_code, 200)
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.state["state"], "failed")
        self.assertIn("Aider", self.plan.state["error"])
        self.assertTrue(
            CodeOperation.objects.filter(operation="plan.failed", plan=self.plan).exists()
        )

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_zadanie_bez_planu_przyjmuje_raport(self):
        # CodeJob.plan jest SET_NULL: plan mógł zniknąć (usunięte
        # repozytorium kaskadowo), a raport i tak musi się przyjąć.
        self.job.plan = None
        self.job.save(update_fields=["plan"])
        response = self._post(
            {"state": "succeeded", "pullRequestUrl": "https://github.com/x/y/pull/1"},
            HTTP_X_BENGOS_WORKER=SEKRET,
        )
        self.assertEqual(response.status_code, 200)

    def test_nieznane_zadanie_404(self):
        # Najpierw sekret — dopiero potem istnienie. Bez tego 404 zdradzałoby,
        # które zadania istnieją, każdemu kto pyta.
        response = self.client.post(
            reverse("v1:complete_job", kwargs={"job_id": str(uuid.uuid4())}),
            data={"state": "running"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
