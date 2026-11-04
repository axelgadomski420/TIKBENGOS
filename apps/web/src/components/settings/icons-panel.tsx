"use client";

import Link from "next/link";
import { useState } from "react";

import { Announcement } from "@/components/announcement";

/**
 * Panel ikon PWA.
 *
 * Trzy ikony są wymagane przez manifest i przez audyt repozytorium, ale samych
 * plików PNG w repozytorium nie ma — nie da się ich wygenerować bez uruchomienia
 * biblioteki grafiki, a tego w tym zadaniu nie wolno.
 *
 * Zamiast zostawiać po tym cichy brak, panel mówi wprost, czego brakuje
i czym to wygenerować. Nie tworzy ikon na miejscu w przeglądarce: plik
 * wygenerowany po stronie klienta nie trafiłby do obrazu aplikacji, więc
 * instalacja PWA dalej byłaby bez ikony, a użytkownik uznałby, że jest
 * naprawiona.
 */
export function IconsPanel() {
  const [announcement, setAnnouncement] = useState("");

  const icons = [
    { src: "/icons/icon-192.png", opis: "192×192, cel „any”" },
    { src: "/icons/icon-512.png", opis: "512×512, cel „any”" },
    { src: "/icons/icon-maskable-512.png", opis: "512×512, cel „maskable”" },
  ];

  return (
    <section aria-labelledby="icons-title" className="bengos-surface-card">
      <Announcement message={announcement} />
      <h2 id="icons-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
        Ikony aplikacji
      </h2>
      <p className="mt-2 text-[var(--bengos-text-muted)]">
        Manifest wymienia trzy ikony. Dopóki nie ma plików, instalacja działa, ale bez
        ikony na pulpicie — to nie jest błąd działania, tylko brak grafiki.
      </p>

      <ul className="mt-4 space-y-2">
        {icons.map((icon) => (
          <li key={icon.src} className="flex flex-wrap items-center gap-3">
            <span className="font-[var(--bengos-font-mono)] text-[var(--bengos-size-caption)]">
              {icon.src}
            </span>
            <span className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              {icon.opis}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[var(--bengos-text-muted)]">
        Generuje je skrypt w repozytorium. Uruchom go na maszynie i wgraj pliki:
      </p>
      <p className="mt-2 font-[var(--bengos-font-mono)] text-[var(--bengos-size-caption)]">
        python3 scripts/generate-icons.py
      </p>

      <p className="mt-4">
        <button
          type="button"
          onClick={() => {
            setAnnouncement("Sprawdzam ikony ponownie w tej przeglądarce.");
            window.location.reload();
          }}
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4"
        >
          Sprawdź ponownie w tej przeglądarce
        </button>
      </p>

      <p className="mt-3">
        <Link
          href="/settings"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] px-2 text-[var(--bengos-accent)]"
        >
          Wróć do ustawień
        </Link>
      </p>
    </section>
  );
}
