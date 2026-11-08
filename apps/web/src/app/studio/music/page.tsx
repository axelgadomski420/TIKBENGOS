import type { Metadata } from "next";

import { MusicStudio } from "@/components/music/music-studio";

export const metadata: Metadata = { title: "Muzyka — BENGOS Studio" };

/**
 * Muzyka — Etap 5.
 *
 * Działa TERAZ: sekwencer BENGOS Beat (kompozycja w przeglądarce, render
 * do WAV, zapis do biblioteki), biblioteka utworów z odtwarzaniem, licencja
 * utworu zależna od pochodzenia, limity generacji widoczne przed zleceniem.
 *
 * Dojdzie (napisane wprost): wykonanie generacji MusicGen/JASCO na maszynie
 * z GPU (MUSICGEN_ENDPOINT) — zlecenia dzisiaj powstają i czekają, a panel
 * nie udaje postępu, którego nie ma.
 */
export default function StudioMusicPage() {
  return <MusicStudio />;
}
