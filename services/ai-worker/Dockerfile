FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /srv
COPY services/ai-worker/worker.py /srv/worker.py
EXPOSE 8092
CMD ["python", "/srv/worker.py"]
