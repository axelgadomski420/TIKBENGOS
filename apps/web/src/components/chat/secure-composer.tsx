"use client";

import { useRef, useState } from "react";

import { toMorse } from "@bengos/core";

import type { SealPayload } from "@/lib/seal";

const BTN =
  "inline-flex min-h-11 items-center rounded-md border border-[var(--bengos-border)] px-3 text-xs";
const INPUT =
  "min-h-11 w-full rounded-md border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3 py-2 text-sm";

const GLOSSES = ["CZEŚĆ", "DZIĘKUJĘ", "PROSZĘ", "TAK", "NIE", "POMOC", "JA", "TY", "ROZUMIEM", "DOM"];
const LANGS = [
  ["en", "angielski"],
  ["de", "niemiecki"],
  ["uk", "ukraiński"],
  ["es", "hiszpański"],
  ["fr", "francuski"],
] as const;

async function fileToData(file: File, max: number): Promise<string> {
  if (file.size > max) throw new Error("Plik jest za duży do pieczęci w wiadomości (limit " + Math.round(max / 1000) + " KB).");
  const data = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(data);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] ?? 0);
  return `data:${file.type || "application/octet-stream"};base64,${btoa(binary)}`;
}

async function translate(text: string, lang: string): Promise<string> {
  const response = await fetch("/api/oracle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "assistant",
      messages: [{ role: "user", content: `Przetłumacz na język ${lang}. Oddaj samo tłumaczenie:\n${text}` }],
    }),
  });
  const body = (await response.json()) as { ok?: boolean; text?: string; error?: string };
  if (!response.ok || !body.ok || !body.text) throw new Error(body.error || "Tłumaczenie nie wróciło z Oracle.");
  return body.text.trim();
}

export function SecureComposer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (payload: SealPayload) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [morseOn, setMorseOn] = useState(true);
  const [gloss, setGloss] = useState("");
  const [lang, setLang] = useState<(typeof LANGS)[number][0] | "">("");
  const [translation, setTranslation] = useState("");
  const [ttl, setTtl] = useState<"" | "1" | "24" | "168">("");
  const [attachment, setAttachment] = useState<{ type: SealPayload["type"]; data: string; name: string; mime: string } | null>(null);
  const [note, setNote] = useState("");
  const camera = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const morse = toMorse(gloss || draft);

  async function shoot() {
    const video = camera.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(video.videoWidth, 640);
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * canvas.width);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setAttachment({ type: "sign", data: canvas.toDataURL("image/jpeg", 0.7), name: "mig.jpg", mime: "image/jpeg" });
  }

  async function armCamera() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = await navigator.mediaDevices.getUserMedia({ video: true });
    if (camera.current) camera.current.srcObject = stream.current;
  }

  async function recordVoice() {
    const media = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(media);
    const chunks: Blob[] = [];
    const transcript = await new Promise<string | null>((resolve) => {
      const host = window as unknown as {
        SpeechRecognition?: new () => {
          lang: string;
          onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
        webkitSpeechRecognition?: new () => {
          lang: string;
          onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
      };
      const Ctor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
      if (!Ctor) {
        resolve(null);
        return;
      }
      const recognition = new Ctor();
      recognition.lang = "pl-PL";
      recognition.onresult = (event) => resolve(event.results[0]?.[0]?.transcript ?? null);
      recognition.onerror = () => resolve(null);
      recognition.start();
      window.setTimeout(() => recognition.stop(), 4000);
    }).catch(() => null);
    await new Promise<void>((resolve) => {
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => resolve();
      recorder.start();
      window.setTimeout(() => recorder.stop(), 4000);
    });
    media.getTracks().forEach((track) => track.stop());
    const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
    const data = await fileToData(new File([blob], "glos.webm", { type: blob.type }), 280_000);
    setAttachment({ type: "voice", data, name: "glos.webm", mime: blob.type });
    if (transcript) setDraft((prev) => prev || transcript);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setNote("");
    const body = draft.trim();
    const type = attachment?.type ?? (gloss ? "sign" : morseOn && !body ? "morse" : "text");
    if (!body && !gloss && !attachment) return;
    let translations: Record<string, string> = {};
    if (lang && (body || gloss)) {
      try {
        translations = { [lang]: await translate(body || gloss, lang) };
        setTranslation(translations[lang] ?? "");
      } catch (error) {
        setNote(error instanceof Error ? error.message : "Tłumaczenie nie doszło.");
        return;
      }
    }
    const hours = ttl ? Number(ttl) : 0;
    await onSend({
      type,
      body,
      morse: morseOn ? morse : "",
      translations,
      signGloss: gloss,
      mime: attachment?.mime ?? "",
      name: attachment?.name ?? "",
      data: attachment?.data ?? "",
      transcript: type === "voice" ? body || null : null,
      expiresAt: hours ? new Date(Date.now() + hours * 3600_000).toISOString() : null,
    });
    setDraft("");
    setGloss("");
    setAttachment(null);
    setTranslation("");
  }

  return (
    <form className="space-y-2 border-t border-[var(--bengos-border)] pt-2" onSubmit={(event) => void submit(event)}>
      <textarea className={INPUT} value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="Wiadomość. Wyjdzie zaszyfrowana." />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN} onClick={() => setMorseOn((value) => !value)}>
          {morseOn ? "Morse włączony" : "Morse wyłączony"}
        </button>
        <label className={BTN}>
          Obraz
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void fileToData(file, 350_000)
                .then((data) => setAttachment({ type: "image", data, name: file.name, mime: file.type }))
                .catch((error: unknown) => setNote(error instanceof Error ? error.message : "Nie wczytałem obrazu."));
            }}
          />
        </label>
        <label className={BTN}>
          Plik
          <input
            className="sr-only"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void fileToData(file, 200_000)
                .then((data) => setAttachment({ type: "file", data, name: file.name, mime: file.type }))
                .catch((error: unknown) => setNote(error instanceof Error ? error.message : "Nie wczytałem pliku."));
            }}
          />
        </label>
        <button type="button" className={BTN} onClick={() => void recordVoice().catch(() => setNote("Mikrofon niedostępny."))}>
          Głos 4 s
        </button>
        <button type="button" className={BTN} onClick={() => void armCamera().catch(() => setNote("Kamera niedostępna."))}>
          Kamera migowa
        </button>
        <button type="button" className={BTN} onClick={() => void shoot()}>
          Klatka
        </button>
        <label className="text-xs">
          Tłumacz na Oracle
          <select className="ml-2 min-h-11 rounded-md border border-[var(--bengos-border)] bg-transparent px-2" value={lang} onChange={(event) => setLang(event.target.value as typeof lang)}>
            <option value="">nie</option>
            {LANGS.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Znika
          <select className="ml-2 min-h-11 rounded-md border border-[var(--bengos-border)] bg-transparent px-2" value={ttl} onChange={(event) => setTtl(event.target.value as typeof ttl)}>
            <option value="">zostaje</option>
            <option value="1">za godzinę</option>
            <option value="24">za dobę</option>
            <option value="168">za tydzień</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {GLOSSES.map((item) => (
          <button key={item} type="button" className={BTN} onClick={() => setGloss(item)}>
            {item}
          </button>
        ))}
      </div>
      <video ref={camera} autoPlay muted playsInline className="max-h-40 rounded-md" />
      {morseOn && morse ? <p className="text-xs opacity-80">Morse: {morse}</p> : null}
      {translation ? <p className="text-xs">Tłumaczenie wejdzie do pieczęci: {translation}</p> : null}
      {attachment ? <p className="text-xs">Załącznik: {attachment.name}. Szyfrowany przed wysyłką.</p> : null}
      {note ? <p role="alert" className="text-xs">{note}</p> : null}
      <p className="text-xs opacity-70">
        Gloss migowy, Morse i tłumaczenie jadą w jednej pieczęci. Rozpoznawanie znaków z kamery nie jest zgadywane — zapisujemy klatkę i gloss, który wybierasz.
      </p>
      <button type="submit" className="min-h-11 rounded-md bg-[var(--bengos-accent)] px-4 text-sm font-medium text-[var(--bengos-text-on-accent)] disabled:opacity-60" disabled={busy}>
        {busy ? "Pieczętuję…" : "Wyślij pieczęć"}
      </button>
    </form>
  );
}
