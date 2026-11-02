"""Panel administracyjny.

Reguła jednorazowego pokazania obowiązuje także tutaj: panel nie jest
wyjątkiem od niej. Widać nazwę, prefiks i ostatnie cztery znaki — nigdy
wartości, ani zaszyfrowanej, ani skrótu, którym dałoby się wyszukać klucz.
"""

from django.contrib import admin

from .models import ApiKey, AuditLog, ProviderCredential, User


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


@admin.register(ProviderCredential)
class ProviderCredentialAdmin(admin.ModelAdmin):
    list_display = ("provider_id", "name", "user", "prefix", "last_four", "created_at", "revoked_at")
    list_filter = ("provider_id",)
    search_fields = ("name", "user__username", "provider_id", "prefix")
    exclude = ("secret_encrypted", "lookup_hash")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "user", "resource", "created_at")
    list_filter = ("action",)
    readonly_fields = ("id", "created_at")
