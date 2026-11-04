// Import BEZ rozszerzenia `.js` — patrz komentarz w `identity.ts`.
import type { JobKind, JobStatus, RealtimeEvent } from "./api";

/**
 * Wspólny kształt każdej długiej operacji.
 *
 * Ten plik istnieje po to, żeby interfejs nie odpytrywał serwera w pętli.
 * Zadanie się zleca, dostaje identyfikator i kanał, a wynik przychodzi
 * zdarzeniem. Każdy moduł używa tego samego mechanizmu — generacja muzyki,
 * transkodowanie wideo, transkrypcja, praca agenta kodującego.
 */

/** Końcowe stany zadania — po nich nic się już nie zmieni. */
const TERMINAL: readonly JobStatus["state"][] = ["succeeded", "failed", "cancelled"];

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL.includes(status.state);
}

export function isRunning(status: JobStatus): boolean {
  return status.state === "running" || status.state === "queued";
}

/** Postęp 0–1 — jedna liczba dla dowolnego zadania, do paska postępu. */
export function progressOf(status: JobStatus): number {
  switch (status.state) {
    case "queued":
      return 0;
    case "running":
      return Math.min(1, Math.max(0, status.progress));
    case "succeeded":
      return 1;
    default:
      return 0;
  }
}

/**
 * Zdanie do pokazania użytkownikowi. Pisane w języku użytkownika, nie
 * nazwami technicznymi — „Przygotowuję wideo”, nie „video.transcode”.
 */
export function describeStatus(kind: JobKind, status: JobStatus): string {
  const noun: Record<JobKind, string> = {
    "video.transcode": "wideo",
    "video.thumbnail": "miniaturę",
    "audio.transcribe": "napisów",
    "music.generate": "utworu",
    "assistant.run": "odpowiedzi",
    "code.plan": "planu zmian",
    "code.apply": "zmian w repozytorium",
  };

  switch (status.state) {
    case "queued":
      return status.position === null
        ? `Zadanie przygotowania ${noun[kind]} czeka w kolejce.`
        : `Zadanie przygotowania ${noun[kind]} czeka w kolejce — pozycja ${status.position}.`;
    case "running":
      return `Przygotowuję ${noun[kind]} — ${Math.round(status.progress * 100)}%, etap: ${status.stage}.`;
    case "succeeded":
      return `Gotowe: ${noun[kind]}.`;
    case "failed":
      return `Nie udało się przygotować ${noun[kind]}: ${status.error.message}`;
    case "cancelled":
      return `Zadanie przygotowania ${noun[kind]} zostało anulowane.`;
  }
}

/**
 * Filtr zdarzeń dla jednego zadania. Kanał jest wspólny dla instancji, więc
 * subskrybent musi odsiać cudze zadania.
 */
export function jobEventFilter(jobId: string, event: RealtimeEvent): boolean {
  return (event.type === "job.progress" || event.type === "job.finished") && event.jobId === jobId;
}

/**
 * Tłumaczenia i wybór języka.
 *
 * Model jest taki jak w telefonie: jedno ustawienie języka interfejsu,
 * jedno ustawienie formatu regionalnego, i oba niezależne. Język interfejsu
 * nie przesądza o formacie daty ani waluty — to jest dokładnie ten błąd,
 * który w większości aplikacji sprawia, że nie da się ich używać w drugim
 * języku bez zmiany regionu.
 *
 * Tłumaczenia są danymi. Dodanie języka nie wymaga zmiany kodu — wystarczy
 * nowy katalog komunikatów.
 */

export type LanguageTag = string; // BCP 47, np. "pl", "en", "pt-BR"

export interface LocaleDefinition {
  tag: LanguageTag;
  /** Nazwa w tym języku — „Polski”, nie „Polish”. */
  nativeName: string;
  /** Nazwa po angielsku, do wyszukiwania w ustawieniach. */
  englishName: string;
  direction: "ltr" | "rtl";
  /** Katalog ukończony na tyle, żeby dało się go włączyć. */
  complete: boolean;
}

/**
 * Lista startowa. Każdy z tych katalogów musi istnieć, żeby `complete` było
 * prawdą — pole jest tu, żeby nie dało się oznaczyć języka jako gotowego,
 * którego użytkownik nie może faktycznie używać.
 */
export const LOCALES: LocaleDefinition[] = [
  { tag: "pl", nativeName: "Polski", englishName: "Polish", direction: "ltr", complete: true },
  { tag: "en", nativeName: "English", englishName: "English", direction: "ltr", complete: true },
  { tag: "de", nativeName: "Deutsch", englishName: "German", direction: "ltr", complete: false },
  { tag: "es", nativeName: "Español", englishName: "Spanish", direction: "ltr", complete: false },
  { tag: "fr", nativeName: "Français", englishName: "French", direction: "ltr", complete: false },
  { tag: "uk", nativeName: "Українська", englishName: "Ukrainian", direction: "ltr", complete: false },
  { tag: "ar", nativeName: "العربية", englishName: "Arabic", direction: "rtl", complete: false },
  { tag: "he", nativeName: "עברית", englishName: "Hebrew", direction: "rtl", complete: false },
  { tag: "ja", nativeName: "日本語", englishName: "Japanese", direction: "ltr", complete: false },
  { tag: "zh-Hans", nativeName: "简体中文", englishName: "Chinese (Simplified)", direction: "ltr", complete: false },
];

/** Język domyślny, gdy nic nie jest ustawione i nie da się wykryć otoczenia. */
export const FALLBACK_LOCALE: LanguageTag = "en";

/** Ustawienia regionalne — niezależne od języka interfejsu. */
export interface RegionSettings {
  /** Gdzie użytkownik jest, do formatu daty, liczby i waluty. */
  region: string; // ISO 3166-1 alpha-2, np. "PL"
  /** Format czasu — 24 godziny albo AM/PM. */
  hourCycle: "h23" | "h12";
  /** Pierwszy dzień tygodnia. */
  weekStartsOn: 0 | 1;
  timeZone: string; // IANA, np. "Europe/Warsaw"
}

export const DEFAULT_REGION: RegionSettings = {
  region: "PL",
  hourCycle: "h23",
  weekStartsOn: 1,
  timeZone: "Europe/Warsaw",
};

/** Komunikat to zawsze funkcja przyjmująca parametry — nigdy sklejany tekst. */
export type MessageRenderer = (params?: Record<string, string | number>) => string;

export type Catalogue = Record<string, MessageRenderer>;

/**
 * Znajduje katalog po tagu, schodząc do języka bez regionu.
 * `pt-BR` bez własnego katalogu użyje `pt`, a nie angielskiego.
 */
export function resolveCatalogue(
  tag: LanguageTag,
  catalogues: Record<LanguageTag, Catalogue>,
): { tag: LanguageTag; catalogue: Catalogue } | null {
  if (catalogues[tag]) return { tag, catalogue: catalogues[tag] };
  const base = tag.split("-")[0];
  if (base && catalogues[base]) return { tag: base, catalogue: catalogues[base] };
  return null;
}

/**
 * Tłumaczy klucz. Brakujący klucz zwraca sam klucz zamiast pustego miejsca —
 * brak tłumaczenia ma być widoczny, nie ukryty.
 */
export function translate(
  catalogue: Catalogue | null,
  key: string,
  params?: Record<string, string | number>,
): string {
  const renderer = catalogue?.[key];
  return renderer ? renderer(params) : key;
}

/**
 * Nazwa języka do pokazania — w tym języku, jeśli system go zna.
 * Użytkownik szuka „Polski”, nie „Polish”.
 */
export function localeDisplayName(tag: LanguageTag): string {
  const known = LOCALES.find((l) => l.tag === tag);
  if (known) return known.nativeName;
  try {
    return new Intl.DisplayNames([tag], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}
