from django.apps import AppConfig


class AiConfig(AppConfig):
    # Asystent to domena pytań i odpowiedzi z modelem LLM — osobna aplikacja,
    # bo jej cykl życia jest inny niż reszty: zlecenie odchododzi do workera
    # i wraca przez endpoint zwrotny, a nie jest obsługiwane w żądaniu.
    default_auto_field = "django.db.models.BigAutoField"
    name = "ai"
