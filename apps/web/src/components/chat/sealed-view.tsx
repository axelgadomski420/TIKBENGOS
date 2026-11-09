"use client";

import { useEffect, useState } from "react";

import type { Message } from "@bengos/core";
import { fromMorse, toMorse } from "@bengos/core";

import type { SealIdentity, SealPayload } from "@/lib/seal";
import { consumeLocalPrekey, openPayload, readCached, writeCached } from "@/lib/seal";

const LANG: Record<string, string> = { en: "angielski", de: "niemiecki", uk: "ukraiński", es: "hiszpański", fr: "francuski" };

function playMorse(pattern: string) {
  const audio = new AudioContext();
  const now = audio.currentTime;
  let at = now;
  const beep = (duration: number) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 660;
    osc.connect(gain);
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.04, at);
    osc.start(at);
    osc.stop(at + duration);
    at += duration + 0.08;
  };
  for (const symbol of pattern) {
    if (symbol === ".") beep(0.08);
    else if (symbol === "-") beep(0.22);
    else if (symbol === " ") at += 0.16;
    else if (symbol === "/") at += 0.4;
  }
  window.setTimeout(() => void audio.close(), Math.max(500, (at - now) * 1000 + 200));
}

export function SealedView({
  message,
  identity,
  onIdentity,
  onExpire,
}: {
  message: Message;
  identity: SealIdentity | null;
  onIdentity: (next: SealIdentity) => void;
  onExpire: (id: string) => void;
}) {
  const [payload, setPayload] = useState<SealPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (message.kind.type !== "sealed" || !identity) return;
    const cached = readCached(message.id);
    if (cached) {
      setPayload(cached);
      return;
    }
    let cancelled = false;
    void openPayload(message.kind, identity)
      .then((opened) => {
        if (cancelled) return;
        writeCached(message.id, opened.payload);
        setPayload(opened.payload);
        if (opened.prekeyId) onIdentity(consumeLocalPrekey(identity, opened.prekeyId));
        if (opened.payload.expiresAt && new Date(opened.payload.expiresAt).getTime() <= Date.now()) {
          onExpire(message.id);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Zaszyfrowane. Tego klucza nie ma na tym urządzeniu.");
      });
    return () => {
      cancelled = true;
    };
  }, [message, identity, onExpire, onIdentity]);

  if (message.kind.type !== "sealed") return null;
  if (!identity) return <p>Klucz urządzenia jeszcze się ładuje.</p>;
  if (error) return <p>{error}</p>;
  if (!payload) return <p>Otwieram pieczęć…</p>;

  const morse = payload.morse || (payload.body ? toMorse(payload.body) : "");
  return (
    <div className="space-y-2">
      {payload.type === "image" || payload.type === "sign" ? (
        payload.data ? (
          // Treść jest już odszyfrowana lokalnie. To nie jest adres z sieci.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={payload.data} alt={payload.signGloss || payload.body || "Obraz"} className="max-h-64 rounded-md" />
        ) : null
      ) : null}
      {payload.type === "voice" && payload.data ? <audio controls src={payload.data} className="max-w-full" /> : null}
      {payload.type === "file" && payload.data ? (
        <a href={payload.data} download={payload.name || "plik"} className="underline">
          {payload.name || "Plik"}
        </a>
      ) : null}
      {payload.body ? <p>{payload.body}</p> : null}
      {payload.transcript ? <p className="opacity-80">Transkrypcja: {payload.transcript}</p> : null}
      {payload.signGloss ? <p>Migowy: {payload.signGloss}</p> : null}
      {morse ? (
        <p>
          Morse: {morse}{" "}
          <button type="button" className="underline" onClick={() => playMorse(morse)}>
            odtwórz
          </button>
          {payload.type === "morse" ? ` → ${fromMorse(morse)}` : null}
        </p>
      ) : null}
      {Object.entries(payload.translations ?? {}).map(([code, text]) => (
        <p key={code}>
          {LANG[code] ?? code}: {text}
        </p>
      ))}
      {payload.expiresAt ? <p className="opacity-70">Znika {new Date(payload.expiresAt).toLocaleString("pl-PL")}</p> : null}
    </div>
  );
}
