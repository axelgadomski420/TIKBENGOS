"""
Rejestracja modeli feedu w panelu administracyjnym.

Panel nie jest tu dla ozdoby: bez niego nie da się usunąć wpisu, który łamie
zasady, a to jest operacja, która przy moderacji musi być wykonalna od razu.
"""

from django.contrib import admin

from .models import Follow, Like, Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "body", "like_count", "comment_count", "created_at")
    list_filter = ("created_at",)
    search_fields = ("body", "author__username")
    # Wpisy są dowodem działań użytkownika — nie kasujemy ich hurtem
    # z panelu jednym kliknięciem.
    actions = None


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "post", "created_at")
    search_fields = ("user__username",)


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ("id", "follower", "followed", "created_at")
    search_fields = ("follower__username", "followed__username")
