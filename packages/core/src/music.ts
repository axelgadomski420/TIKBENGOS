/**
 * Muzyka AI — BENGOS Studio.
 *
 * Biblioteka pochodzi z TIKMUSIC (Audiocraft, MusicGen i JASCO), ale kontrakt
 * jest asynchroniczny od pierwszego dnia: żądanie generacji nigdy nie czeka
 * na model, bo model nie mieści się na maszynie aplikacyjnej.
 */

export interface GenerateTrackRequest {
  /** Opis utworu. Wymagany. */
  prompt: string;
  /** Długość w sekundach. MusicGen generuje porcjami; powyżej limitu utwór
   * powstaje z kilku fragmentów i interfejs musi o tym wiedzieć. */
  durationSeconds?: number;
  style?: string;
  /** Kontynuacja istniejącego utworu zamiast nowego. */
  continueFromTrackId?: string;
}

/**
 * Model generujący. "webaudio-sequencer" dołączył z Etapu 5: to jedyny
 * sposób tworzenia muzyki, który działa BEZ maszyny z GPU — sekwencer
 * liczy dźwięk w przeglądarce, a serwer tylko przechowuje wynik.
 * Nie jest to model AI i nie udaje, że jest.
 */
export type ModelId =
  | "musicgen-small"
  | "musicgen-medium"
  | "musicgen-melody"
  | "jasco"
  | "webaudio-sequencer";

export interface GenerateTrackResponse {
  jobId: string;
  channel: string;
  /** Czego można się spodziewać. Uczciwie: `medium` wymaga GPU 16 GB. */
  model: ModelId;
  estimatedSeconds: number | null;
}

export interface Track {
  id: string;
  ownerId: string;
  title: string;
  prompt: string;
  model: ModelId;
  durationSeconds: number;
  /** Utwór może być przypisany do więcej niż jednego wideo. To relacja,
   * nie pole w poście. Pusta lista znaczy "nie przypisano" — nie "nie działa". */
  attachedToPostIds: string[];
  licence: TrackLicence;
  audioUrl: string | null;
  createdAt: string;
}

/**
 * Utwór wygenerowany przez model ma warunki użycia, o których użytkownik
 * musi się dowiedzieć zanim go opublikuje, a nie po.
 */
export interface TrackLicence {
  /** `commercial` wymaga sprawdzenia przez użytkownika; warunki wag modelu
   * nie są tożsame z licencją kodu i różnią się między modelami. */
  commercialUseAllowed: boolean | null;
  attributionRequired: boolean;
  notes: string;
}

/**
 * Limity generacji. Egzekwowane po stronie serwera; interfejs pokazuje je,
 * żeby użytkownik wiedział, gdzie jest, zanim trafi w ścianę.
 */
export interface GenerationQuota {
  limitPerDay: number;
  usedToday: number;
  remainingToday: number;
  resetsAt: string;
}

/**
 * Przypisanie utworu do wideo. Długość się dopasowuje: utwór dłuższy jest
 * przycinany, krótszy zapętlany — decyzja należy do użytkownika, więc jest
 * jawnym parametrem, nie automatyką.
 */
export interface AttachTrackRequest {
  postId: string;
  trackId: string;
  fit: "trim" | "loop" | "allow-short";
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
}
