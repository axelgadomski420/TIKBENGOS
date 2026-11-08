# BENGOS

> **Jedna aplikacja. Wszystkie możliwości.**  
> Wideo, czat, muzyka AI, asystent, kod i pełna dostępność — w jednym, ultra-nowoczesnym produkcie webowym.

![status](https://img.shields.io/badge/status-MVP--in--progress-blue)
![license](https://img.shields.io/badge/license-TBD-lightgrey)
![stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Django-blue)
![accessibility](https://img.shields.io/badge/accessibility-WCAG%202.2%20AA-green)
![i18n](https://img.shields.io/badge/i18n-multi--language-blueviolet)

---

## Co to jest

**BENGOS** to nie kolejna aplikacja społecznościowa.

To **system operacyjny dla twórczości, społeczności i kodu**:

- krótkie wideo i dźwięki,
- czat w czasie rzeczywistym,
- muzyka generowana AI,
- inteligentny asystent,
- agent kodujący zintegrowany z GitHubem,
- pełna dostępność: napisy, TTS, STT, język migowy, wibracje Morse’a.

Wszystko w jednej, spójnej aplikacji webowej typu PWA.

---

## Dlaczego BENGOS

| Problem | Rozwiązanie BENGOS |
|---|---|
| Osobne aplikacje na wideo, czat, muzykę i kod | Jeden pulpit, jedna tożsamość, jedna baza |
| AI tylko jako chatbot | AI jako aktywny asystent w całym produkcie |
| Dostępność jako dodatek | Dostępność jako fundament |
| Wolne, ciężkie aplikacje | PWA, offline-first, szybki frontend |
| Trudne wdrożenie | Docker + darmowy stack startowy |
| Brak integracji z kodem | GitHub + agent kodujący w aplikacji |
| Tylko jeden język | Pełne i18n: UI, treści, SEO, dostępność |

---

## Główne funkcje

- **BENGOS Feed** — krótkie wideo, profile, lajki, komentarze, udostępnienia.
- **BENGOS Studio** — tworzenie wideo, muzyki i postów.
- **BENGOS Music** — generowanie muzyki AI z promptu.
- **BENGOS Chat** — czat 1:1 i grupowy w czasie rzeczywistym.
- **BENGOS Assistant** — globalny asystent AI z kontekstem aplikacji.
- **BENGOS Dev** — GitHub, issues, pull requesty, agent kodujący.
- **BENGOS Access** — napisy, TTS, STT, język migowy, wibracje Morse’a.
- **BENGOS Profile** — tożsamość, projekty, ustawienia, historia AI.

---

## Motywy

BENGOS ma **trzy motywy**, przełączalne w ustawieniach i zapisywane per użytkownik.

| Motyw | Charakter | Zastosowanie |
|---|---|---|
| **Dark Nebula** | Ciemny, głęboki, premium | Domyślny, wieczorne używanie |
| **Aurora Light** | Jasny, czysty, minimalny | Praca w dzień, czytelność |
| **Solar Flux** | Energetyczny, wyrazisty | Kreatywność, streaming, live |

### Design tokens

```css
:root {
  --bengos-surface: #0B0B0F;
  --bengos-surface-raised: #15151C;
  --bengos-accent: #7C5CFF;
  --bengos-glow: rgba(124, 92, 255, 0.35);
  --bengos-text-primary: #F5F5F7;
  --bengos-text-muted: #9A9AA5;
  --bengos-radius-card: 20px;
  --bengos-focus-ring: #7C5CFF;
  --bengos-motion-fast: 150ms;
  --bengos-motion-smooth: 300ms;
}

[data-theme="aurora-light"] {
  --bengos-surface: #FFFFFF;
  --bengos-surface-raised: #F5F5F7;
  --bengos-accent: #0066FF;
  --bengos-text-primary: #0B0B0F;
  --bengos-text-muted: #5A5A66;
}

[data-theme="solar-flux"] {
  --bengos-surface: #12060A;
  --bengos-surface-raised: #1E0A12;
  --bengos-accent: #FF3D6E;
  --bengos-text-primary: #FFF5F7;
  --bengos-text-muted: #B98A94;
}
