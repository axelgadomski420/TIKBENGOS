"""Testy feedu — kontrakt kursora i licznik polubień.

Testy nie wymagają PostgreSQL: `settings.py` obsługuje `sqlite:///`, więc
te sprawdzenia dają się uruchomić bez stawiania bazy. To jest powód, dla
którego ten tryb istnieje.
"""

import uuid

from django.test import TestCase
from django.urls import reverse

from accounts.models import User

from .models import BODY_MAX_LENGTH, Like, Post


class PostListTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="autorka", email="autorka@example.com", password="haslo-bardzo-dlugie", roles=["user"]
        )

    def test_pusta_lista_bez_wpisow(self):
        response = self.client.get(reverse("v1:list_posts"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"], [])
        self.assertIsNone(response.json()["nextCursor"])

    def test_wpis_trafia_do_listy_z_licznikami(self):
        Post.objects.create(author=self.author, body="pierwszy wpis")
        response = self.client.get(reverse("v1:list_posts"))
        items = response.json()["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["body"], "pierwszy wpis")
        self.assertEqual(items[0]["counters"]["likes"], 0)

    def test_kursor_nie_powtarza_wpisow(self):
        first = Post.objects.create(author=self.author, body="pierwszy")
        Post.objects.create(author=self.author, body="drugi")
        page = self.client.get(reverse("v1:list_posts"), {"limit": 1}).json()
        self.assertEqual(len(page["items"]), 1)
        self.assertIsNotNone(page["nextCursor"])

        second = self.client.get(
            reverse("v1:list_posts"), {"limit": 1, "cursor": page["nextCursor"]}
        ).json()
        self.assertEqual(len(second["items"]), 1)
        self.assertNotEqual(second["items"][0]["id"], page["items"][0]["id"])

    def test_nieznany_filtr_jest_bledem(self):
        response = self.client.get(reverse("v1:list_posts"), {"filter": "cokolwiek"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "bad_request")

    def test_following_bez_sesji_jest_pusta_lista(self):
        response = self.client.get(reverse("v1:list_posts"), {"filter": "following"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"], [])


class PostCreateTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="tworca", email="tworca@example.com", password="haslo-bardzo-dlugie", roles=["creator"]
        )
        self.client.force_login(self.user)

    def test_wpis_dluzszy_niz_limit_jest_odrzucany(self):
        response = self.client.post(
            reverse("v1:create_post"),
            data={"body": "x" * (BODY_MAX_LENGTH + 1)},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["field"], "body")

    def test_puste_tagi_i_duplikaty_sa_usuwane(self):
        response = self.client.post(
            reverse("v1:create_post"),
            data={"body": "z tagami", "tags": [" Dostępność ", "dostępność", "", "test"]},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["tags"], ["dostępność", "test"])

    def test_wpis_bez_sesji_jest_odrzucany(self):
        self.client.logout()
        response = self.client.post(
            reverse("v1:create_post"),
            data={"body": "wpis"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)


class LikeTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="autorka", email="a@example.com", password="haslo-bardzo-dlugie", roles=["user"]
        )
        self.viewer = User.objects.create_user(
            username="widz", email="w@example.com", password="haslo-bardzo-dlugie", roles=["user"]
        )
        self.post = Post.objects.create(author=self.author, body="do polubienia")
        self.client.force_login(self.viewer)

    def test_polubienie_liczy_sie_raz(self):
        url = reverse("v1:like_post", kwargs={"post_id": str(self.post.id)})
        first = self.client.post(url)
        second = self.client.post(url)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["counters"]["likes"], 1)
        self.assertEqual(Like.objects.filter(post=self.post).count(), 1)

    def test_cofniecie_polubienia_zmniejsza_licznik(self):
        self.client.post(reverse("v1:like_post", kwargs={"post_id": str(self.post.id)}))
        response = self.client.delete(reverse("v1:like_post", kwargs={"post_id": str(self.post.id)}))
        self.assertEqual(response.json()["counters"]["likes"], 0)
        self.assertFalse(response.json()["liked"])

    def test_polubienie_bez_sesji_jest_odrzucane(self):
        self.client.logout()
        response = self.client.post(reverse("v1:like_post", kwargs={"post_id": str(self.post.id)}))
        self.assertEqual(response.status_code, 401)

    def test_nieistniejacy_wpis_daje_404(self):
        response = self.client.post(reverse("v1:like_post", kwargs={"post_id": str(uuid.uuid4())}))
        self.assertEqual(response.status_code, 404)
