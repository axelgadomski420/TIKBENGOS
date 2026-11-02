FROM python:3.12-slim

# Python 3.12, nie 3.13: MediaPipe i TensorFlow nie mają wydania dla 3.13,
# a Aider wymaga wersji poniżej 3.13. Jedna wersja na całym stosie.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv

# libpq-dev i gcc są potrzebne do zbudowania psycopg. W obrazie finalnym
# zostają, bo `migrate` i `gunicorn` też działają z tym samym środowiskiem.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY services/api/requirements.txt /srv/requirements.txt
RUN pip install --upgrade pip && pip install -r /srv/requirements.txt

COPY services/api /srv

# `staticfiles` musi istnieć przed `collectstatic`, inaczej Django zgłasza
# ostrzeżenie o brakującym katalogu docelowym przy każdym starcie.
RUN mkdir -p /srv/staticfiles && chmod -R 755 /srv

EXPOSE 8000

# Domyślna komenda to `gunicorn`, nie `runserver`: obraz ma sens w produkcji
# bez nadpisywania komendy. Compose developerski jawnie nadpisuje ją na
# `runserver`, więc środowisko lokalne nadal ma auto-przeładowanie.
CMD ["gunicorn", "tikbengos.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]
