"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fromMorse, MORSE_TABLE, toMorse } from "@bengos/core";

/**
 * Narzędzia dostępności — Etap 4 (przeglądarka).
 *
 * Wszystkie funkcje tu działają BEZ serwera: syntezator mowy i rozpoznanie
 * mowy to API przeglądarki, Morse liczy kontrakt `@bengos/core`, a
 * wibracja to Web Vibration API. To jest decyzja świadoma: dostępność ma
 * działać też bez sieci i bez GPU — pomoc techniczna nie może zależeć
 * od najdroższego komponentu systemu.
 *
 * Czego tu NIE ma i czemu — patrz lista na dole strony.
 */

// Design system projektu: klasy bengos-* i tokeny --bengos-*, jak w feedzie
// i czacie — dostępność nie dostaje osobnego wyglądu, bo osobny wygląd
// to osobne punkty awarii.
const BTN =
  "bengos-touch-target inline-flex items-center rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 text-[var(--bengos-size-caption)]";
const BTN_PRIMARY =
  "bengos-touch-target inline-flex items-center rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] disabled:opacity-60";
const INPUT =
  "min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3 py-2 text-[var(--bengos-size-caption)]";

// Web Speech API nie ma pełnej deklaracji typów w TS — opisujemy tylko
// to, czego używamy, zamiast `any`.
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const MORSE_DOT_MS = 90;
const MORSE_DASH_MS = 270;
const MORSE_GAP_MS = 90;
const MORSE_LETTER_GAP_MS = 270;
const MORSE_WORD_GAP_MS = 810;

function morseToVibrationPattern(morse: string): number[] {
  // Wzorzec Web Vibration API to naprzemiennie [wibruj, pauza, ...].
  // Budujemy go z zapisu kropka/myślnik, żeby osoba głucha i niewidoma
  // dostała treść dotykiem — to kanał, nie efekt.
  const pattern: number[] = [];
  for (const symbol of morse) {
    if (symbol === "." || symbol === "-") {
      pattern.push(symbol === "." ? MORSE_DOT_MS : MORSE_DASH_MS);
      pattern.push(MORSE_GAP_MS);
    } else if (symbol === " ") {
      pattern.push(MORSE_LETTER_GAP_MS);
    } else if (symbol === "/") {
      pattern.push(MORSE_WORD_GAP_MS);
    }
  }
  return pattern;
}

export function AccessTools() {
  // ── TTS ──────────────────────────────────────────────────────────────
  const [ttsText, setTtsText] = useState("Cześć. To jest test syntezatora mowy TIKBENGOS.");
  const [ttsRate, setTtsRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState<string>("");
  const [speaking, setSpeaking] = useState(false);

  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const loadVoices = useCallback(() => {
    if (!ttsSupported) return;
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) {
      setVoices(list);
      setVoiceUri((prev) => {
        if (prev) return prev;
        const polish = list.find((v) => v.lang.toLowerCase().startsWith("pl"));
        return (polish ?? list[0]).voiceURI;
      });
    }
  }, [ttsSupported]);

  useEffect(() => {
    if (!ttsSupported) return;
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, [ttsSupported, loadVoices]);

  const speak = useCallback(() => {
    if (!ttsSupported || ttsText.trim().length === 0) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(ttsText);
    utterance.lang = "pl-PL";
    utterance.rate = ttsRate;
    const voice = voices.find((v) => v.voiceURI === voiceUri);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [ttsSupported, ttsText, ttsRate, voices, voiceUri]);

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [ttsSupported]);

  // ── STT ──────────────────────────────────────────────────────────────
  const [sttSupported, setSttSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [sttText, setSttText] = useState("");
  const [sttError, setSttError] = useState("");

  useEffect(() => {
    // Web Speech Recognition nie istnieje w Safari/Firefox na desktopie —
    // wykrywanie w efekcie, nie przy renderze, żeby strona działała
    // także przy wyłączonym JS po stronie serwera renderującego.
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    setSttSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);

  const startListening = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "pl-PL";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setSttText(transcript.trim());
    };
    recognition.onerror = (event) => {
      setSttError(
        event.error === "not-allowed"
          ? "Dostęp do mikrofonu został odrzucony. Zezwól na mikrofon w ustawieniach przeglądarki."
          : "Rozpoznawanie mowy przerwało się z błędem."
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    setSttError("");
    setListening(true);
    recognition.start();
  }, []);

  // ── Morse ────────────────────────────────────────────────────────────
  const [morseInput, setMorseInput] = useState("TIKBENGOS");
  const [morseDecoded, setMorseDecoded] = useState("");
  const morseSupported = typeof window !== "undefined" && "navigator" in window;
  const canVibrate = morseSupported && typeof navigator.vibrate === "function";

  const morseEncoded = useMemo(() => toMorse(morseInput), [morseInput]);

  const vibrateMorse = useCallback(() => {
    if (!canVibrate || morseEncoded.length === 0) return;
    navigator.vibrate(morseToVibrationPattern(morseEncoded));
  }, [canVibrate, morseEncoded]);

  const decodeMorse = useCallback(() => {
    try {
      setMorseDecoded(fromMorse(morseDecoded.length > 0 ? morseInput : morseEncoded) || "(puste)");
    } catch {
      setMorseDecoded("Nie udało się odczytać zapisu — używaj kropek, myślników i ukośników.");
    }
  }, [morseInput, morseEncoded, morseDecoded]);

  return (
    <section aria-labelledby="access-title" className="space-y-6">
      <header>
        <h1
          id="access-title"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)]"
        >
          Dostępność
        </h1>
        <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Narzędzia, które działają od razu — w przeglądarce, bez sieci
          i bez silnika AI. Dostępność jest fundamentem, nie dodatkiem:
          stąd najpierw to, co działa wszędzie.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── TTS ── */}
        <div className="bengos-surface-card space-y-3 p-4">
          <h2 className="text-[var(--bengos-size-caption)] font-[var(--bengos-weight-semibold)]">
            Czytanie na głos (TTS)
          </h2>
          {!ttsSupported ? (
            <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              Ta przeglądarka nie ma syntezatora mowy. Na komputerze działa
              to w Chrome, Edge i Safari; w aplikacji mobilnej dojdzie
              natywny syntezator.
            </p>
          ) : (
            <>
              <label className="block text-[var(--bengos-size-caption)]" htmlFor="tts-text">
                Tekst do przeczytania
              </label>
              <textarea
                id="tts-text"
                className={INPUT + " min-h-[80px]"}
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
              />
              <label className="block text-[var(--bengos-size-caption)]" htmlFor="tts-voice">
                Głos
              </label>
              <select
                id="tts-voice"
                className={INPUT}
                value={voiceUri}
                onChange={(e) => setVoiceUri(e.target.value)}
              >
                {voices.length === 0 ? <option value="">Domyślny</option> : null}
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              <label className="block text-[var(--bengos-size-caption)]" htmlFor="tts-rate">
                Szybkość: {ttsRate.toFixed(1)}x
              </label>
              <input
                id="tts-rate"
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={ttsRate}
                onChange={(e) => setTtsRate(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2">
                <button type="button" className={BTN_PRIMARY} onClick={speak}>
                  Czytaj
                </button>
                <button type="button" className={BTN} onClick={stopSpeaking} disabled={!speaking}>
                  Zatrzymaj
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── STT ── */}
        <div className="bengos-surface-card space-y-3 p-4">
          <h2 className="text-[var(--bengos-size-caption)] font-[var(--bengos-weight-semibold)]">
            Wpisywanie głosem (STT)
          </h2>
          {!sttSupported ? (
            <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              Ta przeglądarka nie obsługuje rozpoznawania mowy. Działa w
              Chrome i Edge; serwerowy STT (Whisper) dojdzie z napisami
              w wideo i czacie.
            </p>
          ) : (
            <>
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={startListening}
                disabled={listening}
              >
                {listening ? "Słucham… mów" : "Zacznij mówić"}
              </button>
              {sttError ? (
                <p role="alert" className="text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]">
                  {sttError}
                </p>
              ) : null}
              <label className="block text-[var(--bengos-size-caption)]" htmlFor="stt-text">
                Rozpoznany tekst
              </label>
              <textarea
                id="stt-text"
                className={INPUT + " min-h-[80px]"}
                value={sttText}
                onChange={(e) => setSttText(e.target.value)}
                placeholder="Tu pojawi się tekst z mowy"
              />
            </>
          )}
        </div>

        {/* ── Morse ── */}
        <div className="bengos-surface-card space-y-3 p-4 lg:col-span-2">
          <h2 className="text-[var(--bengos-size-caption)] font-[var(--bengos-weight-semibold)]">
            Morse — tekst, dotyk, wibracja
          </h2>
          <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Kodowanie i dekodowanie liczy kontrakt `@bengos/core` — jedna
            tabela znaków działa i w czacie, i tutaj.
          </p>
          <label className="block text-[var(--bengos-size-caption)]" htmlFor="morse-input">
            Tekst do zakodowania
          </label>
          <input
            id="morse-input"
            className={INPUT}
            value={morseInput}
            onChange={(e) => setMorseInput(e.target.value)}
          />
          <output
            className="block rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] p-2 font-mono text-[var(--bengos-size-caption)]"
            htmlFor="morse-input"
          >
            {morseEncoded || "(puste)"}
          </output>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BTN} onClick={decodeMorse}>
              Dekoduj własny zapis
            </button>
            <button
              type="button"
              className={BTN}
              onClick={vibrateMorse}
              disabled={!canVibrate || morseEncoded.length === 0}
            >
              Przekaż wibracją
            </button>
          </div>
          {!canVibrate ? (
            <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              To urządzenie nie ma wibracji — kod Morse zobaczysz tutaj
              jako zapis; wibracja działa na telefonie.
            </p>
          ) : null}
          {morseDecoded ? (
            <p className="text-[var(--bengos-size-caption)]">
              Odczyt: <span className="font-mono">{morseDecoded}</span>
            </p>
          ) : null}
          <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Aby zdekodować własny zapis, wpisz go w pole powyżej i kliknij
            „Dekoduj własny zapis” — kropki, myślniki, spacje między
            literami, ukośniki między słowami.
          </p>
        </div>
      </div>

      {/* ── Co dojdzie ── */}
      <div className="bengos-surface-card space-y-2 p-4">
        <h2 className="text-[var(--bengos-size-caption)] font-[var(--bengos-weight-semibold)]">Co dojdzie</h2>
        <ul className="list-disc space-y-1 pl-5 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          <li>Napisy w wideo i czacie — worker mediów z modelem STT.</li>
          <li>Tłumaczenie polskiego języka migowego (PJM) — osobny worker,
            na start alfabet palcowy i podstawowe komendy.</li>
          <li>Tłumaczenia wiadomości na żywo w czacie.</li>
          <li>Tryb Morse’a w czacie: wysyłanie i odbiór wibracją.</li>
        </ul>
        <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Alfabet palcowy zamiast pełnego PJM to wybór uczciwy: pełny język
          migowy wymaga własnego modelu i zbioru danych. Kłamstwo
          „obsługujemy PJM” byłoby gorsze niż jego brak.
        </p>
      </div>
    </section>
  );
}
