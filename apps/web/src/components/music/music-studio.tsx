"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiError, Track } from "@bengos/core";

import { Announcement } from "@/components/announcement";
import { apiFetch, ApiRequestError, csrfToken, toApiError } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

/**
 * BENGOS Studio — muzyka.
 *
 * Dwie drogi do utworu, obie prawdziwe:
 * 1. SEKWENCER BENGOS BEAT — komponujesz w przeglądarce. WebAudio liczy
 *    dźwięk, OfflineAudioContext renderuje WAV, plik leci do biblioteki
 *    przez /api/music/tracks. Działa bez GPU, bez sieci do workera,
 *    bez czegokolwiek poza przeglądarką.
 * 2. GENERACJA AI — MusicGen/JASCO przez zlecenie asynchroniczne. Bez
 *    workera GPU (MUSICGEN_ENDPOINT) zadanie czeka w kolejce i TAK jest
 *    opisane: żaden pasek postępu nie udaje, że ktoś go liczy.
 *
 * Upload idzie multipartem, więc nie przez apiFetch (JSON-only): apiUpload
 * niżej dokłada ten sam token CSRF i to samo tłumaczenie błędów.
 */

const STEPS = 16;
const LOOPS_IN_RENDER = 4;

const NOTE_ROWS = [
  { id: "c6", freq: 1046.5, label: "C6" },
  { id: "a5", freq: 880.0, label: "A5" },
  { id: "g5", freq: 783.99, label: "G5" },
  { id: "e5", freq: 659.25, label: "E5" },
  { id: "d5", freq: 587.33, label: "D5" },
  { id: "c5", freq: 523.25, label: "C5" },
];

const DRUM_ROWS = [
  { id: "hat", label: "hi-hat" },
  { id: "kick", label: "stopa" },
];

const ALL_ROWS = [...NOTE_ROWS, ...DRUM_ROWS];

const MODELS = [
  { id: "musicgen-small", label: "MusicGen small (GPU 8 GB)" },
  { id: "musicgen-medium", label: "MusicGen medium (GPU 16 GB)" },
  { id: "musicgen-melody", label: "MusicGen melody (GPU 16 GB)" },
  { id: "jasco", label: "JASCO (GPU)" },
] as const;

interface QuotaInfo {
  limitPerDay: number;
  usedToday: number;
  remainingToday: number;
  resetsAt: string;
}

interface JobStatusInfo {
  state?: string;
  progress?: number;
  stage?: string;
  error?: { message?: string } | null;
  resultRef?: string;
  position?: number | null;
}

const BTN =
  "bengos-touch-target inline-flex items-center rounded-[var(--bengos-radius-control)] border px-4 text-[var(--bengos-size-caption)]";
const BTN_PRIMARY =
  "bengos-touch-target inline-flex items-center rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] disabled:opacity-60";
const INPUT =
  "min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3";

function messageOf(cause: unknown): ApiError {
  return cause instanceof ApiRequestError
    ? cause.error
    : { code: "internal", message: "Nieznany błąd." };
}

async function apiUpload<T>(path: string, file: Blob, fields: Record<string, string>): Promise<T> {
  const csrf = await csrfToken();
  const form = new FormData();
  form.append("file", file);
  for (const key of Object.keys(fields)) form.append(key, fields[key]);
  const res = await fetch(path, {
    method: "POST",
    headers: csrf ? { "x-csrf-token": csrf } : {},
    body: form,
    credentials: "same-origin",
  });
  if (res.status === 204) return undefined as T;
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) throw new ApiRequestError(toApiError(res.status, payload));
  return payload as T;
}

// ── Synteza dźwięku — jeden moduł dla odtwarzania i renderu ──────────
// Dlatego bierze BaseAudioContext: AudioContext i OfflineAudioContext
// dziedziczą po nim, a dźwięk ma być IDENTYCZNY na żywo i w pliku.

function playNote(ctx: BaseAudioContext, at: number, freq: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.22, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.3);
}

function playKick(ctx: BaseAudioContext, at: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.exponentialRampToValueAtTime(40, at + 0.12);
  gain.gain.setValueAtTime(0.5, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.2);
}

function playHat(ctx: BaseAudioContext, at: number) {
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = "highpass";
  filter.frequency.value = 7000;
  gain.gain.value = 0.18;
  src.buffer = buffer;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(at);
}

function scheduleCell(ctx: BaseAudioContext, at: number, rowId: string) {
  const note = NOTE_ROWS.find((r) => r.id === rowId);
  if (note) {
    playNote(ctx, at, note.freq);
    return;
  }
  if (rowId === "kick") playKick(ctx, at);
  if (rowId === "hat") playHat(ctx, at);
}

function encodeWav(buffer: AudioBuffer): Blob {
  const view = new DataView(new ArrayBuffer(44 + buffer.length * 2));
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + buffer.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, buffer.length * 2, true);
  const channel = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < channel.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, channel[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

type AudioCtor = new (channels: number, length: number, rate: number) => BaseAudioContext;

export function MusicStudio() {
  const { isAuthenticated } = useSession();

  const [grid, setGrid] = useState<Record<string, boolean>>({});
  const [tempo, setTempo] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [title, setTitle] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>("musicgen-small");
  const [job, setJob] = useState<{ id: string; status: JobStatusInfo | null } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const ctxRef = useRef<{ ctx: BaseAudioContext; stop: () => void } | null>(null);

  const reloadLibrary = useCallback(async () => {
    try {
      const [page, quotaInfo] = await Promise.all([
        apiFetch<{ items: Track[] }>("/api/music/tracks"),
        apiFetch<QuotaInfo>("/api/music/quota"),
      ]);
      setTracks(page.items ?? []);
      setQuota(quotaInfo);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void reloadLibrary();
  }, [isAuthenticated, reloadLibrary]);

  // Sprzątanie przy odmontowaniu: węzeł audio nie umiera sam.
  useEffect(() => {
    return () => {
      ctxRef.current?.stop();
    };
  }, []);

  const stepDuration = 60 / tempo / 4; // szesnastki

  const toggleCell = (rowId: string, step: number) => {
    const key = rowId + "-" + step;
    setGrid((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const stopPlayback = useCallback(() => {
    ctxRef.current?.stop();
    ctxRef.current = null;
    setPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    stopPlayback();
    const Ctor = (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext) as
      | AudioCtor
      | undefined;
    if (!Ctor) {
      setAnnouncement("Ta przeglądarka nie ma WebAudio — sekwencer potrzebuje Chrome, Edge lub Safari.");
      return;
    }
    const ctx = new Ctor(1, 44100, 44100) as AudioContext;
    let cancelled = false;
    const runLoop = (loopStart: number) => {
      if (cancelled) return;
      for (let step = 0; step < STEPS; step += 1) {
        for (const row of ALL_ROWS) {
          if (grid[row.id + "-" + step]) scheduleCell(ctx, loopStart + step * stepDuration, row.id);
        }
      }
      const next = loopStart + STEPS * stepDuration;
      const delayMs = Math.max(50, (next - ctx.currentTime - 0.1) * 1000);
      timer = setTimeout(() => runLoop(next), delayMs);
    };
    let timer = setTimeout(() => runLoop(ctx.currentTime + 0.05), 0);
    ctxRef.current = {
      ctx,
      stop: () => {
        cancelled = true;
        clearTimeout(timer);
        void ctx.close();
      },
    };
    setPlaying(true);
  }, [grid, stepDuration, stopPlayback]);

  const saveToLibrary = useCallback(async () => {
    if (rendering) return;
    setRendering(true);
    setError(null);
    try {
      const Ctor = (window.OfflineAudioContext ??
        (window as unknown as { webkitOfflineAudioContext?: AudioCtor }).webkitOfflineAudioContext) as
        | AudioCtor
        | undefined;
      if (!Ctor) {
        throw new ApiRequestError({ code: "unavailable", message: "Ta przeglądarka nie umie renderować audio." });
      }
      const duration = stepDuration * STEPS * LOOPS_IN_RENDER;
      const ctx = new Ctor(1, Math.ceil(44100 * duration), 44100);
      for (let loop = 0; loop < LOOPS_IN_RENDER; loop += 1) {
        const loopStart = 0.05 + loop * STEPS * stepDuration;
        for (let step = 0; step < STEPS; step += 1) {
          for (const row of ALL_ROWS) {
            if (grid[row.id + "-" + step]) scheduleCell(ctx, loopStart + step * stepDuration, row.id);
          }
        }
      }
      const rendered = await (ctx as OfflineAudioContext).startRendering();
      const blob = encodeWav(rendered);
      const cleanTitle = (title || "BENGOS Beat").trim().slice(0, 200);
      await apiUpload<Track>("/api/music/tracks", blob, {
        title: cleanTitle,
        durationSeconds: String(Math.round(duration * 10) / 10),
      });
      setAnnouncement("Utwór zapisany w bibliotece.");
      setTitle("");
      await reloadLibrary();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setRendering(false);
    }
  }, [rendering, grid, stepDuration, title, reloadLibrary]);

  const removeTrack = useCallback(async (id: string) => {
    try {
      await apiFetch("/api/music/tracks/" + id, { method: "DELETE" });
      setAnnouncement("Utwór usunięty.");
      await reloadLibrary();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [reloadLibrary]);

  const submitGeneration = useCallback(async () => {
    setError(null);
    try {
      const created = await apiFetch<{ jobId: string }>("/api/music/generate", {
        method: "POST",
        body: { prompt: prompt.trim(), model, durationSeconds: 30 },
      });
      setJob({ id: created.jobId, status: null });
      setAnnouncement("Zlecenie przyjęte. Status sprawdzisz poniżej.");
      await reloadLibrary();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [prompt, model, reloadLibrary]);

  const refreshJob = useCallback(async () => {
    if (!job) return;
    try {
      const status = await apiFetch<JobStatusInfo>("/api/music/jobs/" + job.id);
      setJob({ ...job, status });
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [job]);

  if (!isAuthenticated) {
    return (
      <section className="bengos-surface-card" aria-labelledby="music-login">
        <h1 id="music-login" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Muzyka jest dla zalogowanych
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Utwory w bibliotece są prywatne i licencja jest przypisana do autora —
          bez konta nie ma komu przypisać dzieła.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="music-title" className="space-y-6">
      <header>
        <p className="bengos-eyebrow">Etap 5 — sekwencer działa</p>
        <h1 id="music-title" className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
          Muzyka
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Sekwencer BENGOS Beat komponuje i zapisuje utwór w przeglądarce — bez GPU.
          Generacja MusicGen/JASCO wymaga workera na maszynie z GPU
          (MUSICGEN_ENDPOINT); bez niego zlecenia czekają w kolejce i widzisz to
          tutaj, zamiast zmyślonego postępu.
        </p>
      </header>

      <Announcement message={announcement} />
      {error ? (
        <div role="alert" className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-4 py-3">
          <p>{error.message}</p>
        </div>
      ) : null}

      {/* ── Sekwencer ── */}
      <div className="bengos-surface-card">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          BENGOS Beat — sekwencer
        </h2>
        <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Kliknij kratki: 16 kroków, skala pentatoniczna plus stopa i hi-hat.
          Odtwarzanie liczy WebAudio w przeglądarce; zapis renderuje WAV
          i wysyła do Twojej biblioteki.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="text-[var(--bengos-size-caption)]">
            <caption className="sr-only">Siatka kroków sekwencera</caption>
            <tbody>
              {ALL_ROWS.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="pr-2 text-left font-[var(--bengos-weight-medium)]">
                    {row.label}
                  </th>
                  {Array.from({ length: STEPS }, (_, step) => {
                    const key = row.id + "-" + step;
                    const on = Boolean(grid[key]);
                    return (
                      <td key={key} className="p-0.5">
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={row.label + ", krok " + (step + 1)}
                          onClick={() => toggleCell(row.id, step)}
                          className={
                            "h-8 w-8 rounded-[var(--bengos-radius-control)] border " +
                            (on
                              ? "border-[var(--bengos-accent)] bg-[var(--bengos-accent)]"
                              : "border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)]")
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className={BTN_PRIMARY} onClick={() => (playing ? stopPlayback() : startPlayback())}>
            {playing ? "Stop" : "Graj"}
          </button>
          <label htmlFor="tempo" className="text-[var(--bengos-size-caption)]">
            Tempo: {tempo} BPM
          </label>
          <input
            id="tempo"
            type="range"
            min={60}
            max={180}
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="w-40"
          />
        </div>

        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveToLibrary();
          }}
        >
          <label htmlFor="track-title" className="sr-only">Tytuł utworu</label>
          <input
            id="track-title"
            className={INPUT + " max-w-[16rem]"}
            placeholder="Tytuł utworu"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          <button type="submit" disabled={rendering} className={BTN_PRIMARY}>
            {rendering ? "Renderuję…" : "Zapisz w bibliotece (WAV)"}
          </button>
        </form>
      </div>

      {/* ── Generacja AI ── */}
      <div className="bengos-surface-card">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Generowanie AI (MusicGen, JASCO)
        </h2>
        <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Zlecenie jest asynchroniczne z definicji kontraktu. Bez workera GPU
          zadanie CZEKA w kolejce — to stan prawdziwy, opisany tu bez owijania.
        </p>
        {quota ? (
          <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]">
            Limity: wykorzystane dzisiaj {quota.usedToday} z {quota.limitPerDay} · reset {quota.resetsAt}
          </p>
        ) : null}

        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitGeneration();
          }}
        >
          <label htmlFor="gen-prompt" className="block text-[var(--bengos-size-caption)]">
            Opis utworu
          </label>
          <textarea
            id="gen-prompt"
            className={INPUT + " min-h-[70px]"}
            placeholder="Np. spokojny ambient z deszczem i fortepianem"
            value={prompt}
            maxLength={4000}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <label htmlFor="gen-model" className="block text-[var(--bengos-size-caption)]">Model</label>
          <select id="gen-model" className={INPUT} value={model} onChange={(e) => setModel(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <button type="submit" disabled={prompt.trim().length === 0} className={BTN_PRIMARY}>
            Zleć generację
          </button>
        </form>

        {job ? (
          <div className="mt-3 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] p-3">
            <p className="text-[var(--bengos-size-caption)]">
              Zadanie {job.id.slice(0, 8)}…
              {job.status ? " · stan: " + String(job.status.state) : " · kliknij „Odśwież stan”, aby sprawdzić"}
            </p>
            {job.status && job.status.state === "running" ? (
              <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]">
                Postęp: {Math.round((job.status.progress ?? 0) * 100)}% · {job.status.stage}
              </p>
            ) : null}
            {job.status && job.status.state === "failed" && job.status.error ? (
              <p role="alert" className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]">
                {job.status.error.message}
              </p>
            ) : null}
            {job.status && (job.status.state === "queued" || job.status.state === "running") ? (
              <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                Bez workera GPU zadanie czeka — nie ma tu paska postępu, bo
                nikt by go nie liczył. Po podłączeniu MUSICGEN_ENDPOINT
                odświeżanie pokaże realny postęp.
              </p>
            ) : null}
            <button type="button" className={BTN + " mt-2 border-[var(--bengos-border)]"} onClick={() => void refreshJob()}>
              Odśwież stan
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Biblioteka ── */}
      <div className="bengos-surface-card">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Biblioteka</h2>
        <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Utwory są prywatne. Licencja zależy od pochodzenia: dzieło z sekwencera
          jest w pełni Twoje; utwór z MusicGen niesie warunki wag modelu —
          zobacz pole „licencja” przy utworze.
        </p>
        <ul className="mt-3 space-y-2">
          {tracks.map((track) => (
            <li key={track.id} className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] p-3">
              <p className="font-[var(--bengos-weight-medium)]">{track.title}</p>
              <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {track.model} · {Math.round(track.durationSeconds)} s · licencja:{" "}
                {track.licence.notes}
              </p>
              {track.audioUrl ? (
                <audio controls preload="none" src={track.audioUrl} className="mt-2 w-full" />
              ) : (
                <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                  Plik audio jeszcze nie istnieje — utwór czeka na worker.
                </p>
              )}
              <button type="button" className={BTN + " mt-2 border-[var(--bengos-border)] text-[var(--bengos-text-muted)]"} onClick={() => void removeTrack(track.id)}>
                Usuń
              </button>
            </li>
          ))}
        </ul>
        {tracks.length === 0 ? (
          <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Biblioteka jest pusta — zapisz pierwszy utwór z sekwencera powyżej.
          </p>
        ) : null}
      </div>
    </section>
  );
}
