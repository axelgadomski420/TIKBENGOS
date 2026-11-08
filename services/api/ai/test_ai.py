"""Testy asystenta — bez sieci i bez modelu LLM.

Worker z modelem to osobna usługa, więc testy sprawdzają kontrakt:
bez endpointu 503, z endpointem zadanie w kolejce, dyspatsza zamockowana
(monkeypatch, nie prawdziwe sieci), endpoint zwrotny z sekretem, historia
właściciela. Wzorzec z test_music.py — ta sama granica, ten sam styl.
"""

import uuid
from unittest import mock

from django.test import TestCase, override_settings
from django.urls import reverse

from accounts.models import User

from .models import AssistantJob

SEKRET = "sekret-workerowi"


class AskTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="iza", email="iza@example.com", password="haslo-ma-dlugie-12")
        self.client.force_login(self.user)

    def test_bez_modelu_503(self):
        # Asystent bez ASSISTANT_LLM_ENDPOINT mówi NIE — nie generuje
        # odpowiedzi „z ogólnej wiedzy serwera”, bo serwer jej nie ma.
        response = self.client.post(
            reverse("v1:ask_assistant"),
            data='{"prompt": "Jakie pomysły na wideo o moim utworze?"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("ASSISTANT_LLM_ENDPOINT", response.json()["message"])

    @override_settings(ASSISTANT_LLM_ENDPOINT="http://127.0.0.1:8092/jobs")
    def test_z_modelem_twory_zadanie(self):
        with mock.patch("ai.api.urllib.request.urlopen") as urlopen:
            response = self.client.post(
                reverse("v1:ask_assistant"),
                data='{"prompt": "Szkic scenariusza do utworu o Warszawie"}',
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 202, response.content)
        body = response.json()
        self.assertTrue(AssistantJob.objects.filter(id=body["jobId"], state="queued").exists())
        # Dyspatsza poszła z pytaniem i jobId — dokładnie te dane.
        sent = urlopen.call_args[0][0]
        self.assertEqual(sent.full_url, "http://127.0.0.1:8092/jobs")

    @override_settings(ASSISTANT_LLM_ENDPOINT="http://127.0.0.1:8092/jobs")
    def test_worker_nie_odpowiada_zadanie_failed(self):
        with mock.patch("ai.api.urllib.request.urlopen", side_effect=OSError("brak")):
            response = self.client.post(
                reverse("v1:ask_assistant"),
                data='{"prompt": "coś"}',
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 202)
        job = AssistantJob.objects.get(prompt="coś")
        self.assertEqual(job.state, "failed")
        self.assertIn("nie odpowiada", job.status()["error"]["message"])

    def test_puste_pytanie_400(self):
        with override_settings(ASSISTANT_LLM_ENDPOINT="http://127.0.0.1:8092/jobs"):
            response = self.client.post(
                reverse("v1:ask_assistant"),
                data='{"prompt": "   "}',
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 400)

    def test_status_tylko_wlasciciela(self):
        job = AssistantJob.objects.create(owner=self.user, prompt="moje pytanie")
        other = User.objects.create_user(username="bob", email="bob@example.com", password="haslo-ma-dlugie-12")
        self.client.force_login(other)
        response = self.client.get(reverse("v1:assistant_job_status", kwargs={"job_id": str(job.id)}))
        self.assertEqual(response.status_code, 404)


class CompleteJobTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ola", email="ola@example.com", password="haslo-ma-dlugie-12")
        self.client.force_login(self.user)
        self.job = AssistantJob.objects.create(owner=self.user, prompt="Pomysły na remiks")

    def _post(self, payload, **extra):
        return self.client.post(
            reverse("v1:assistant_complete_job", kwargs={"job_id": str(self.job.id)}),
            data=payload,
            content_type="application/json",
            **extra,
        )

    def test_zamkniety_bez_sekretu(self):
        response = self._post({"state": "running"})
        self.assertEqual(response.status_code, 403)

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_raport_postepu(self):
        response = self._post(
            {"state": "running", "stage": "Model myśli", "progress": 0.5},
            HTTP_X_BENGOS_WORKER=SEKRET,
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "running")
        self.assertEqual(self.job.status()["stage"], "Model myśli")

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_sukces_zapisuje_odpowiedz(self):
        response = self._post(
            {"state": "succeeded", "answer": "Oto trzy pomysły na remiks: ..."},
            HTTP_X_BENGOS_WORKER=SEKRET,
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "succeeded")
        self.assertIn("remiks", self.job.answer)

        # Odpowiedź widać w historii właściciela.
        response = self.client.get(reverse("v1:assistant_history"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["answer"], self.job.answer)

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_sukces_bez_odpowiedzi_odrzucony(self):
        response = self._post({"state": "succeeded"}, HTTP_X_BENGOS_WORKER=SEKRET)
        self.assertEqual(response.status_code, 400)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "queued")

    @override_settings(BENGOS_WORKER_TOKEN=SEKRET)
    def test_porazka_z_ludzkim_komunikatem(self):
        response = self._post(
            {"state": "failed", "error": "Model nie wczytał się na maszynie."},
            HTTP_X_BENGOS_WORKER=SEKRET,
        )
        self.assertEqual(response.status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "failed")
        self.assertIn("Model", self.job.status()["error"]["message"])

    def test_nieznane_zadanie_najpierw_sekret(self):
        response = self.client.post(
            reverse("v1:assistant_complete_job", kwargs={"job_id": str(uuid.uuid4())}),
            data={"state": "running"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)  # sekret przed istnieniem
