"""Testy muzyki — bez GPU i bez sieci.

Generacja z workera wymaga maszyny z GPU, więc testy sprawdzają to, co
jest prawdą na każdej maszynie: zlecenie tworzy zadanie w kolejce,
limit dzienny działa, upload z sekwencera zapisuje REALNY plik, a dostęp
do utworu ma tylko właściciel.
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
