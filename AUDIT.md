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

## Aktualizacja 2026-11-13

- Dodano dolne menu mobilne PURRE AURA (Discover | Explore | + | Messenger | Arcade | Profil)
- Utworzono moduł PURRE Arcade (stub z grami: 2048, Memory, Quiz, Hex)
- Zaktualizowano domenę na bengos.pl w skryptach deploy
- Zachowano stack Angular + Spring Boot + MySQL + WebSocket

Następne kroki: pełna integracja PURRE Coins + Stripe, HoloFeed z video, Smart Match z paw-match, AI Assistant.
