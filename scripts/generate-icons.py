#!/usr/bin/env python
"""Generuje ikony PWA TIKBENGOS.

Dlaczego plik, a nie gotowe obrazy: ikona musi zgadzać się z tokenami
i z ciemnym motywem, a binarny PNG w repozytorium nie da się przejrzeć
w diffie ani poprawić bez grafika. Ten skrypt jest źródłem prawdy —
icony są jego wynikiem.

Uruchomienie:
    python3 scripts/generate-icons.py

Wymaga biblioteki `pillow`. Nie dodajemy jej do `requirements.txt` API,
bo serwer jej nie potrzebuje: to narzędzie deweloperskie, nie zależność
usługi.

Kolory pochodzą z `packages/ui/src/themes.ts` (motyw ciemny):
    surface  #0B0B0F
    accent   #7C5CFF
    glow     #9B7DFF
"""

from pathlib import Path

from PIL import Image, ImageDraw

SURFACE = (11, 11, 15, 255)  # #0B0B0F
ACCENT = (124, 92, 255, 255)  # #7C5CFF
GLOW = (155, 125, 255, 255)  # #9B7DFF

OUT_DIR = Path(__file__).resolve().parent.parent / "apps" / "web" / "public" / "icons"


def draw_mark(size: int, *, safe_area: float) -> Image.Image:
    """Rysuje znak BENGOS na kwadracie `size` x `size`.

    `safe_area` to margines, jaki musi zostać pusty. Dla ikony maskowalnej
    wynosi 0,25 — Android przycina ikonę do własnego kształtu (kółko,
    kwadrat, łezka) i wszystko poza tą strefą może zniknąć. Trzymanie
    znaku w środkowej połowie jest tym, co odróżnia ikonę maskowalną
    od zwykłej.
    """
    image = Image.new("RGBA", (size, size), SURFACE)
    draw = ImageDraw.Draw(image)

    margin = int(size * safe_area)
    inner = size - margin * 2

    # Pierścień — ta sama forma co `bengos-glow-ring` w arkuszu stylów.
    ring_width = max(2, int(inner * 0.06))
    draw.ellipse(
        (margin, margin, size - margin, size - margin),
        outline=GLOW,
        width=ring_width,
    )

    # Trzy kreski: najmniejszy znak, który da się narysować bez fontu,
    # a który nie jest ani literą, ani niczyim logo.
    bar_height = max(2, inner // 9)
    bar_gap = bar_height
    total = bar_height * 3 + bar_gap * 2
    top = (size - total) // 2

    widths = [0.62, 1.0, 0.78]
    for index, factor in enumerate(widths):
        width = int(inner * 0.5 * factor)
        left = (size - width) // 2
        y = top + index * (bar_height + bar_gap)
        draw.rounded_rectangle(
            (left, y, left + width, y + bar_height),
            radius=bar_height // 2,
            fill=ACCENT,
        )

    return image


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    targets = [
        ("icon-192.png", 192, 0.18),
        ("icon-512.png", 512, 0.18),
        # Ikona maskowalna: większy margines, bo system przycina ją do swojego
        # kształtu. Ta sama treść, ale w bezpiecznej strefie.
        ("icon-maskable-512.png", 512, 0.28),
    ]

    for name, size, safe_area in targets:
        path = OUT_DIR / name
        draw_mark(size, safe_area=safe_area).save(path, format="PNG", optimize=True)
        print(f"zapisano {path.relative_to(OUT_DIR.parent.parent.parent.parent)} ({size}x{size})")


if __name__ == "__main__":
    main()
