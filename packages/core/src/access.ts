/**
 * Dostępność — BENGOS Access.
 *
 * Ten plik jest kontraktem, nie uznaniem, że wszystko działa. Wszędzie tam,
 * gdzie czegoś nie ma, pole `available` jest fałszem, a interfejs ma to
 * pokazać. Obiecanie pełnego tłumaczenia polskiego języka migowego bez
 * wytrenowanego modelu PJM byłoby nieprawdą i ten typ tego pilnuje.
 */

import type { ApiError } from "./api.js";
import type { PerceptionMode } from "./identity.js";

/** Preferencje percepcyjne użytkownika — wspólne dla całej aplikacji. */
export interface AccessibilityPreferences {
  perception: PerceptionMode;
  captionsEnabled: boolean;
  captionsTextSize: "normal" | "large" | "extra-large";
  ttsEnabled: boolean;
  ttsRate: number;
  ttsVoice: string | null;
  sttEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  /** Tryb dostępności: większa typografia i uproszczone powierzchnie. */
  accessibilityMode: boolean;
  morseAlertsEnabled: boolean;
  hapticVibrationEnabled: boolean;
  updatedAt: string;
}

export const DEFAULT_ACCESSIBILITY: AccessibilityPreferences = {
  perception: "both",
  captionsEnabled: true,
  captionsTextSize: "normal",
  ttsEnabled: false,
  ttsRate: 1,
  ttsVoice: null,
  sttEnabled: false,
  reducedMotion: false,
  highContrast: false,
  accessibilityMode: false,
  morseAlertsEnabled: false,
  hapticVibrationEnabled: false,
  updatedAt: new Date(0).toISOString(),
};

/* ───────────────────────── Język migowy ─────────────────────────── */

/**
 * Zakres rozpoznawania jest częścią odpowiedzi, a nie przypisem w dokumentacji.
 * Interfejs musi móc powiedzieć użytkownikowi, czego system nie potrafi.
 */
export interface SignCapabilities {
  available: boolean;
  /** `asl` to rozpoznawany język. `pjm` nie jest rozpoznawany i nie ma
   * wytrenowanego modelu, który dałoby się tu wstawić. */
  languages: { id: "asl"; vocabularySize: number; top1Accuracy: number; top5Accuracy: number }[];
  /** Ciągłe miganie wymaga segmentacji, której nie ma. */
  continuousSigning: false;
  /** Kierunek tekst na mig odtwarza nagrane klipy, nie generuje ruchu. */
  textToSignIsPlayback: true;
  /** Uczciwe ostrzeżenie pokazywane użytkownikowi. */
  limitationNotice: string;
}

export interface SignRecognitionUpdate {
  type: "buffering" | "prediction" | "reset" | "error";
  /** Postęp wypełnienia okna, gdy `buffering`. */
  filled: number;
  needed: number;
  /** Rozpoznany znak, gdy `prediction`. */
  label: string | null;
  confidence: number | null;
  /** Fałsz, gdy ten sam znak już został wypowiedziany — debounce. */
  accepted: boolean;
  handsVisible: boolean;
  error: ApiError | null;
}

/* ───────────────────────────── Morse ────────────────────────────── */

/**
 * Morse nie jest tu kanałem sterowania nadajnikiem — jest kanałem alertów.
 * Sterowanie sprzętem, które było w TIKMORS, nie wchodzi do systemu.
 */
export type MorsePattern = string;

export interface MorseAlert {
  id: string;
  pattern: MorsePattern;
  decoded: string;
  /** Wibracje są możliwe tylko na urządzeniach, które je mają. */
  canVibrate: boolean;
  createdAt: string;
}

/**
 * Tabela znaków przeniesiona z TIKMORS. Oddana do domeny publicznej (CC0),
 * więc nie nakłada ograniczeń.
 */
export const MORSE_TABLE: Record<string, MorsePattern> = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....",
  i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.",
  q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-",
  y: "-.--", z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};

/** Zamienia tekst na wzór Morse'a. Nieznane znaki są pomijane, nie zgadywane. */
export function toMorse(text: string): MorsePattern {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => (ch === " " ? "/" : MORSE_TABLE[ch] ?? ""))
    .filter(Boolean)
    .join(" ");
}

/** Zamienia wzór Morse'a na tekst. Nieznane sekwencje zostają jako `?`. */
export function fromMorse(pattern: MorsePattern): string {
  const reverse = new Map(Object.entries(MORSE_TABLE).map(([ch, code]) => [code, ch]));
  return pattern
    .trim()
    .split(/\s+/)
    .map((code) => (code === "/" ? " " : reverse.get(code) ?? "?"))
    .join("");
}
