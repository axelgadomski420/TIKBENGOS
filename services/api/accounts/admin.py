"""Panel administracyjny.

Klucz API jest tu widoczny tylko jako prefiks i ostatnie cztery znaki —
panel nie jest wyjątkiem od reguły jednorazowego pokazania.
"""

from django.contrib import admin

from .models import ApiKey, AuditLog, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "is_active", "date_joined")
    search_fields = ("username", "email")
    readonly_fields = ("id", "date_joined", "last_login")


@admin.register(ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "prefix", "last_four", "created_at", "revoked_at")
    search_fields = ("name", "user__username", "prefix")
    # `secret_encrypted` i `lookup_hash` są wykluczone z panelu: pierwszy
    # pozwala odtworzyć klucz, drugi — wyszukać go w bazie.
    exclude = ("secret_encrypted", "lookup_hash")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "user", "resource", "created_at")
    list_filter = ("action",)
    readonly_fields = ("id", "created_at")
