FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Warstwa czasu rzeczywistego korzysta z tych samych ustawień Django co API —
# jeden model tożsamości, jedno źródło konfiguracji. Dlatego instalujemy ten
# sam plik zależności, a nie kopiujemy kodu bez jego środowiska. Wcześniejsza
# wersja kopiowała tylko `services/api`, bez `pip install`, więc obraz nie
# miał ani Django, ani `daphne`, ani `channels`.
COPY services/api/requirements.txt /srv/requirements.txt
RUN pip install --upgrade pip && pip install -r /srv/requirements.txt

COPY services/api /srv

EXPOSE 8001

CMD ["daphne", "-b", "0.0.0.0", "-p", "8001", "tikbengos.asgi:application"]
