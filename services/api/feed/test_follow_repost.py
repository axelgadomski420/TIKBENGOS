"""Testy obserwacji i podnieśń — zakończenie tekstowego Etapu 2.

Testy nie wymagają PostgreSQL — tak jak w `test_feed.py`, sqlite wystarcza.
Obie operacje są idempotentne, więc testy sprawdzają też powtórzone żądanie:
ono wraca z tym samym stanem, a nie z błędem.
"""

import uuid

from django.test import TestCase
from django.urls import reverse

from accounts.models import User

from .models import Follow, Post


class FollowTests(TestCase):
    def setUp(self):
        self.viewer = User.objects.create_user(
            username="czytelnik",
            email="czytelnik@example.com",
            password="haslo-bardzo-dlugie",
            roles=["user"],
        )
        self.author = User.objects.create_user(
            username="autorka",
            email="autorka@example.com",
            password="haslo-bardzo-dlugie",
            roles=["user"],
        )
        self.client.force_login(self.viewer)

    def url(self, user_id) -> str:
        return reverse("v1:follow_user", kwargs={"user_id": str(user_id)})

    def test_obserwacja_jest_idempotentna(self):
        first = self.client.post(self.url(self.author.id))
        second = self.client.post(self.url(self.author.id))
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()["following"])
        self.assertTrue(second.json()["following"])
        self.assertEqual(
            Follow.objects.filter(follower=self.viewer, followed=self.author).count(), 1
        )

    def test_obserwowanie_samego_siebie_odrzucone(self):
        response = self.client.post(self.url(self.viewer.id))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["field"], "user_id")

    def test_nieistniejacy_uzytkownik_daje_404(self):
        response = self.client.post(self.url(uuid.uuid4()))
        self.assertEqual(response.status_code, 404)

    def test_cofniecie_obserwacji_idempotentne(self):
        self.client.post(self.url(self.author.id))
        first = self.client.delete(self.url(self.author.id))
        second = self.client.delete(self.url(self.author.id))
        self.assertEqual(first.status_code, 200)
        self.assertFalse(second.json()["following"])
        self.assertEqual(Follow.objects.count(), 0)

    def test_lista_zwraca_obserwowanych_z_danej_strony(self):
        Post.objects.create(author=self.author, body="wpis autorki")
        self.client.post(self.url(self.author.id))
        response = self.client.get(reverse("v1:list_posts"))
        self.assertIn(str(self.author.id), response.json()["following"])

    def test_filtra_obserwowani_pokazuje_wpisy_autora(self):
        Post.objects.create(author=self.author, body="wpis autorki")
        self.client.post(self.url(self.author.id))
        response = self.client.get(reverse("v1:list_posts"), {"filter": "following"})
        self.assertEqual(len(response.json()["items"]), 1)


class RepostTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="autorka",
            email="autorka2@example.com",
            password="haslo-bardzo-dlugie",
            roles=["user"],
        )
        self.viewer = User.objects.create_user(
            username="widz",
            email="widz2@example.com",
            password="haslo-bardzo-dlugie",
            roles=["user"],
        )
        self.post = Post.objects.create(author=self.author, body="oryginal")
        self.client.force_login(self.viewer)

    def url(self, post_id) -> str:
        return reverse("v1:repost_post", kwargs={"post_id": str(post_id)})

    def test_podniesienie_liczy_sie_raz(self):
        first = self.client.post(self.url(self.post.id))
        second = self.client.post(self.url(self.post.id))
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()["reposted"])
        self.assertEqual(second.json()["counters"]["reposts"], 1)
        self.assertEqual(Post.objects.filter(repost_of=self.post).count(), 1)

    def test_podniesienie_nosi_tresc_i_autora_oryginalu(self):
        self.client.post(self.url(self.post.id))
        response = self.client.get(reverse("v1:list_posts"))
        items = response.json()["items"]
        self.assertEqual(len(items), 2)
        # Podniesienie jest nowsze, więc stoi pierwsze w feedzie.
        repost = items[0]
        self.assertEqual(repost["body"], "oryginal")
        self.assertEqual(repost["authorId"], str(self.author.id))
        self.assertEqual(repost["repostedBy"], str(self.viewer.id))
        authors = response.json()["authors"]
        self.assertIn(str(self.author.id), authors)
        self.assertIn(str(self.viewer.id), authors)

    def test_cofniecie_podniesienia_zdejmuje_licznik(self):
        self.client.post(self.url(self.post.id))
        response = self.client.delete(self.url(self.post.id))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["reposted"])
        self.assertEqual(response.json()["counters"]["reposts"], 0)
        self.assertEqual(Post.objects.filter(repost_of=self.post).count(), 0)

    def test_podniesienie_bez_sesji_odrzucone(self):
        self.client.logout()
        response = self.client.post(self.url(self.post.id))
        self.assertEqual(response.status_code, 401)
