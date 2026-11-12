# AUDIT.md — TIKBENGOS → PURRE PETS

**Data audytu:** 2026-11-12  
**Repozytorium:** https://github.com/axelgadomski420/TIKBENGOS  
**Cel:** Produkcyjna, ultrapremium platforma **PURRE PETS** — social marketplace dla hodowców psów i kotów rasowych.

Tagline:  
**PURRE PETS — Where exceptional breeds find exceptional homes.**  
**PURRE PETS — Tam, gdzie wyjątkowe rasy znajdują wyjątkowe domy.**

---

## 1. Struktura katalogów

```
TIKBENGOS/
├── backend/                 # Spring Boot 3.5 / Java 17 (pakiet com.elif — legacy)
│   ├── src/main/java/com/elif/
│   │   ├── controllers/     # adoption, ai, community, events, marketplace, notification, pet_profile, pet_transit, service, user
│   │   ├── entities/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── ...
│   ├── pom.xml
│   └── *_demo_seed.sql
├── frontend/                # Angular 18.2
│   ├── src/app/
│   │   ├── auth/
│   │   ├── front-office/
│   │   ├── back-office/
│   │   └── shared/
│   └── package.json
├── design-system/
├── scripts/wdroz.sh
├── deploy/                  # NOWE — produkcyjne skrypty bare-metal
├── ai-service/              # NOWE — lokalny FastAPI + Ollama
├── docker-compose.yml
└── README.md
```

## 2. Stack technologiczny

| Warstwa     | Technologia                                      |
|-------------|--------------------------------------------------|
| Frontend    | Angular 18.2, TypeScript, Material, Tailwind, STOMP, Leaflet, Chart.js, Lucide, Motion |
| Backend     | Spring Boot 3.5.11, Java 17, JPA, WebSocket/STOMP |
| Baza        | MySQL 8                                          |
| Cache       | Redis                                            |
| Media       | Multipart + Thumbnailator (lokalnie)             |
| Płatności   | Stripe                                           |
| E-mail      | Spring Mail                                      |
| AI (nowe)   | Ollama + Qwen2.5:3b + FastAPI (lokalnie, ≤3 GB RAM) |
| Deploy      | systemd + Nginx + Certbot + UFW                  |

## 3–19. Moduły, encje, endpointy, auth, upload, czat, ogłoszenia, rezerwacje, powiadomienia, moderacja, weryfikacja

Szczegóły jak w poprzednim audycie. Kluczowe:
- Context-path legacy: `/elif` → docelowo `/api` lub `/purre`
- Baza: `Elif` → `purre_pets`
- Usługi systemd: `purre-pets.service`, `purre-ai.service`
- AI lokalne zamiast tylko zewnętrznych API

## 20. Luki i kolejność prac

**Co działa:** auth, profile zwierząt, adoption, marketplace (podstawy), community, events, notifications, upload, WebSocket, Stripe, seeds.

**Do zrobienia (kolejność):**
1. Pełny rebranding UI + docs + skrypty na **PURRE PETS** (ten commit).
2. i18n (pl domyślny + en/de/es/fr/it/uk).
3. System motywów PURRE AURA (8 wariantów) + CSS variables.
4. AI Service (Ollama + Qwen2.5 3B + FastAPI) + integracja moderacji/weryfikacji.
5. HoloFeed + ulepszony Messenger.
6. Pipeline weryfikacji hodowcy.
7. Deploy produkcyjny + DNS + Cloudflare.
8. Testy + CHANGELOG + finalny README.

**Bezpiecznie usunąć / zmienić:** nazwy Elif/BENGOS w UI i dokumentacji, stare placeholdery.
