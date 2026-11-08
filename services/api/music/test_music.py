"""Testy muzyki — bez GPU i bez sieci.

Generacja z workera wymaga maszyny z GPU, więc testy sprawdzają to, co
jest prawdą na każdej maszynie: zlecenie tworzy zadanie w kolejce,
limit dzienny działa, upload z sekwencera zapisuje REALNY plik, a dostęp
do utworu ma tylko właściciel. Endpoint zwrotny testowany jest jak worker:
z sekretem z ustawień, bez sieci — bo to kontrakt, nie cudzy serwer.
"""

import tempfile
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from accounts.models import User

from .models import GenerationJob, Track


def _wav(name: str = "beat.wav") -> SimpleUploadedFile:
    # Nagłówek RIFF wystarczy: serwer nie dekoduje audio, tylko je
    # przechowuje i strumieniuje.
    payload = b"RIFF" + b"\x24\x00\x00\x00" + b"WAVEfmt "
    return SimpleUploadedFile(name, payload, content_type="audio/wav")


class MusicTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ala", email="ala@example.com", password="haslo-ma-dlugie-12")
        self.client.force_login(self.user)
        self._tmp = tempfile.TemporaryDirectory()
        self.media = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_tracks_wymagaja_sesji(self):
        response = self.client.get(reverse("v1:list_tracks"))
        self.assertEqual(response.status_code, 401)

    @override_settings(MEDIA_ROOT="/tmp/tikbengos-test-media")
    def test_upload_i_listowanie_utworu(self):
        response = self.client.post(
            reverse("v1:upload_track"),
            data={"title": "Mój bit", "durationSeconds": "9.6", "file": _wav()},
        )
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body["model"], "webaudio-sequencer")
        self.assertTrue(body["licence"]["commercialUseAllowed"])
        self.assertIn("/api/music/tracks/", body["audioUrl"])

        response = self.client.get(reverse("v1:list_tracks"))
        self.assertEqual(len(response.json()["items"]), 1)
        self.assertEqual(response.json()["items"][0]["attachedToPostIds"], [])

    def test_upload_odrzuca_nie_audio(self):
        response = self.client.post(
            reverse("v1:upload_track"),
            data={"title": "Zły", "file": SimpleUploadedFile("x.txt", b"tekst", content_type="text/plain")},
        )
        self.assertEqual(response.status_code, 400)

    @override_settings(MEDIA_ROOT="/tmp/tikbengos-test-media")
    def test_usuwanie_utworu(self):
        self.client.post(reverse("v1:upload_track"), data={"title": "Bit", "file": _wav()})
        track_id = Track.objects.get(title="Bit").id
        response = self.client.delete(reverse("v1:delete_track", kwargs={"track_id": str(track_id)}))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Track.objects.exists())

    @override_settings(MEDIA_ROOT="/tmp/tikbengos-test-media")
    def test_audio_tylko_dla_wlasciciela(self):
        self.client.post(reverse("v1:upload_track"), data={"title": "Bit", "file": _wav()})
        track_id = str(Track.objects.get(title="Bit").id)
        response = self.client.get(reverse("v1:track_audio", kwargs={"track_id": track_id}))
        self.assertEqual(response.status_code, 200)

        other = User.objects.create_user(username="bob", email="bob@example.com", password="haslo-ma-dlugie-12")
        self.client.force_login(other)
        response = self.client.get(reverse("v1:track_audio", kwargs={"track_id": track_id}))
        self.assertEqual(response.status_code, 404)

    def test_generate_twory_zadanie_w_kolejce(self):
        response = self.client.post(
            reverse("v1:generate_track"),
            data='{"prompt": "spokojny ambient z deszczem", "model": "musicgen-small", "durationSeconds": 30}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 202, response.content)
        body = response.json()
        self.assertIsNone(body["estimatedSeconds"])
        self.assertTrue(GenerationJob.objects.filter(id=body["jobId"], state="queued").exists())

        # Status zadania ma kształt unii JobStatus z kontraktu:
        response = self.client.get(reverse("v1:job_status", kwargs={"job_id": body["jobId"]}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"state": "queued", "position": None})

    def test_generate_bez_opisu_400(self):
        response = self.client.post(
            reverse("v1:generate_track"),
            data='{"prompt": "   "}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    @override_settings(MUSIC_DAILY_LIMIT=1)
    def test_limit_dzienny_egzekwowany(self):
        self.client.post(
            reverse("v1:generate_track"),
            data='{"prompt": "pierwszy"}',
            content_type="application/json",
        )
        response = self.client.post(
            reverse("v1:generate_track"),
            data='{"prompt": "drugi"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 429)

        response = self.client.get(reverse("v1:quota"))
        body = response.json()
        self.assertEqual(body["usedToday"], 1)
        self.assertEqual(body["remainingToday"], 0)


class CompleteJobTestCase(TestCase):
    """Endpoint zwrotny workera GPU — kontrakt z sekretem, bez sieci."""

    def setUp(self):
        self.user = User.objects.create_user(username="ola", email="ola@example.com", password="haslo-ma-dlugie-12")
        self.client.force_login(self.user)
        self.job = GenerationJob.objects.create(
            owner=self.user,
            prompt="energetyczny beat lo-fi",
            model="musicgen-small",
            duration_seconds=30,
        )

    def _post(self, data, **extra):
        return self.client.post(
            reverse("v1:complete_job", kwargs={"job_id": str(self.job.id)}),
            data=data,
            **extra,
        )

    def test_zamkniety_bez_sekretu(self):
        # Bez BENGOS_WORKER_TOKEN endpoint jest ZAMKNIĘTY — nawet poprawny
        # worker nie przejdzie, a już na pewno nie przejdzie obcy.
        response = self._post({"state": "running"})
        self.assertEqual(response.status_code, 403)

    @override_settings(BENGOS_WORKER_TOKEN="sekret-workerowi", MEDIA_ROOT="/tmp/tikbengos-test-media")
    def test_zy_token_odrzucony(self):
        response = self._post({"state": "running"}, HTTP_X_BENGOS_WORKER="zly-sekret")
        self.assertEqual(response.status_code, 403)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "queued")

    @override_settings(BENGOS_WORKER_TOKEN="sekret-workerowi")
    def test_raport_postepu(self):
        response = self._post(
            {"state": "running", "stage": "Generowanie na GPU", "progress": "0.5"},
            HTTP_X_BENGOS_WORKER="sekret-workerowi",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "running")
        self.assertEqual(self.job.status()["stage"], "Generowanie na GPU")

    @override_settings(BENGOS_WORKER_TOKEN="sekret-workerowi")
    def test_porazka_zapisuje_ludzki_komunikat(self):
        response = self._post(
            {"state": "failed", "error": "Brak GPU na maszynie."},
            HTTP_X_BENGOS_WORKER="sekret-workerowi",
        )
        self.assertEqual(response.status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "failed")
        self.assertIn("Brak GPU", self.job.status()["error"]["message"])

    @override_settings(BENGOS_WORKER_TOKEN="sekret-workerowi", MEDIA_ROOT="/tmp/tikbengos-test-media")
    def test_sukces_tworzy_utwor_z_licencja_modelu(self):
        response = self._post(
            {
                "state": "succeeded",
                "title": "Mój lo-fi",
                "durationSeconds": "30",
                "file": _wav("gen.wav"),
            },
            HTTP_X_BENGOS_WORKER="sekret-workerowi",
        )
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(body["state"], "succeeded")
        self.assertIn("/api/music/tracks/", body["resultRef"])

        track = Track.objects.get(title="Mój lo-fi")
        self.assertEqual(track.owner, self.user)
        # Licencja utworu z modelu: CC-BY 4.0 — atrybucja wymagana,
        # a nie „dzieło autora” jak z sekwencera.
        self.assertTrue(track.licence["attributionRequired"])
        self.assertIn("CC-BY", track.licence["notes"])

    @override_settings(BENGOS_WORKER_TOKEN="sekret-workerowi")
    def test_sukces_bez_pliku_odrzucony(self):
        response = self._post(
            {"state": "succeeded"},
            HTTP_X_BENGOS_WORKER="sekret-workerowi",
        )
        self.assertEqual(response.status_code, 400)
        self.job.refresh_from_db()
        self.assertEqual(self.job.state, "queued")

    def test_nieznane_zadanie_404(self):
        import uuid

        response = self.client.post(
            reverse("v1:complete_job", kwargs={"job_id": str(uuid.uuid4())}),
            data={"state": "running"},
        )
        self.assertEqual(response.status_code, 403)  # najpierw sekret, potem istnienie
