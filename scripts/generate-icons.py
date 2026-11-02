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

Gdy brakuje `pillow`, skrypt PRÓBUJE go doinstalować w środowisku
tymczasowym (venv w /tmp). To jest potrzebne przy pierwszym uruchomieniu
na czystej maszynie, gdzie nie ma ani biblioteki, ani czasu na szukanie,
jak ją doinstalować bez psucia systemowego Pythona.

Kolory pochodzą z `packages/ui/src/themes.ts` (motyw ciemny):
    surface  #0B0B0F
    accent   #7C5CFF
    glow     #9B7DFF
"""

import base64
import subprocess
import sys
from pathlib import Path

SURFACE = (11, 11, 15, 255)  # #0B0B0F
ACCENT = (124, 92, 255, 255)  # #7C5CFF
GLOW = (155, 125, 255, 255)  # #9B7DFF

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "apps" / "web" / "public" / "icons"


def _pil():
    """Zwraca moduły Pillow albo kończy z konkretnym komunikatem.

    Kolejność: użyj tego, co jest; jeżeli nie ma — przygotuj tymczasowe
    środowisko i użyj jego Pythona, wznawiając skrypt w podprocesie.
    """
    try:
        from PIL import Image, ImageDraw  # noqa: PLC0415

        return Image, ImageDraw
    except ImportError:
        pass

    venv = Path("/tmp/tikbengos-ikony")
    python = venv / "bin" / "python"

    if not python.exists():
        print("Brak Pillow. Przygotowuję tymczasowe środowisko w /tmp …")
        try:
            subprocess.run([sys.executable, "-m", "venv", str(venv)], check=True)
            subprocess.run(
                [str(python), "-m", "pip", "install", "--quiet", "pillow"], check=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(
                "Nie udało się przygotować Pillow.\n"
                "Zainstaluj ręcznie: python3 -m pip install pillow\n"
                "Aplikacja wstanie bez ikon PWA — manifest wskaże pliki, których nie ma.",
                file=sys.stderr,
            )
            return None, None

    # Wznów ten sam skrypt tym Pythonem, który ma Pillow.
    result = subprocess.run([str(python), str(Path(__file__).resolve()), *_KWARGS])
    sys.exit(result.returncode)


_KWARGS = sys.argv[1:]


def draw_mark(Image, ImageDraw, size: int, *, safe_area: float):
    """Rysuje znak BENGOS na kwadracie `size` x `size`.

    `safe_area` to margines, jaki musi zostać pusty. Dla ikony maskowalnej
    jest większy: Android przycina ikonę do własnego kształtu (kółko,
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
        (margin, margin, size - margin - 1, size - margin - 1),
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


def main() -> int:
    Image, ImageDraw = _pil()
    if Image is None:
        return 1

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
        draw_mark(Image, ImageDraw, size, safe_area=safe_area).save(
            path, format="PNG", optimize=True
        )
        print(f"zapisano {path.relative_to(ROOT)} ({size}x{size}, "
              f"{path.stat().st_size // 1024} KB)")

    # Sprawdzenie, że manifest wskazuje dokładnie te pliki. Rozjazd nazw
    # daje PWA, która instaluje się bez ikony i nikt nie wie dlaczego.
    manifest = ROOT / "apps" / "web" / "public" / "manifest.webmanifest"
    if manifest.exists():
        tresc = manifest.read_text(encoding="utf-8")
        brakujace = [
            name for name, _, _ in targets if f"/icons/{name}" not in tresc
        ]
        if brakujace:
            print(
                f"UWAGA: manifest nie deklaruje: {brakujace}", file=sys.stderr
            )
            return 1
        print("Manifest deklaruje wszystkie trzy ikony.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
