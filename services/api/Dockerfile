FROM python:3.12-slim

# Python 3.12, nie 3.13: MediaPipe i TensorFlow nie mają wydania dla 3.13,
# a Aider wymaga wersji poniżej 3.13. Jedna wersja na całym stosie.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv

# libpq-dev i gcc są potrzebne do zbudowania psycopg; w obrazie finalnym
# zostają, bo `runserver` w trybie developerskim też ich używa.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY services/api/requirements.txt /srv/requirements.txt
RUN pip install --upgrade pip && pip install -r /srv/requirements.txt

COPY services/api /srv

EXPOSE 8000

# Domyślna komenda to serwer developerski; compose nadpisuje ją jawnie.
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
