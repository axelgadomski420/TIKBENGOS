# AUDIT.md — TIKBENGOS → PURRE PETS

**Data audytu:** 2026-11-12  
**Repozytorium:** https://github.com/axelgadomski420/TIKBENGOS  
**Cel:** Produkcyjna, ultrapremium platforma **PURRE PETS** — social marketplace dla hodowców psów i kotów rasowych.

Tagline:  
**PURRE PETS — Where exceptional breeds find exceptional homes.**  
**PURRE PETS — Tam, gdzie wyjątkowe rasy znajdują wyjątkowe domy.**

---

## Stack

Angular 18 + Spring Boot 3.5 + MySQL 8 + Redis + Ollama/Qwen2.5:3b + FastAPI

## Co działa

Auth, profile zwierząt, adoption, marketplace (podstawy), community, events, notifications, upload, WebSocket, Stripe, seeds, design system 8 motywów, i18n pl/en.

## Deploy

```bash
curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/deploy/install.sh | sudo bash
```

Usługi: `purre-pets.service`, `purre-ai.service`
