"use client";

import Link from "next/link";
import { useState } from "react";

import type { Post } from "@bengos/core";

import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { askEngine, readEngine } from "@/lib/engine-client";

type Tool = "video" | "post" | "music" | "code";

const TOOLS: { id: Tool; label: string; desc: string }[] = [
  { id: "post", label: "Post", desc: "Tekst i zdjęcie idą na bengtok." },
  { id: "video", label: "Wideo", desc: "Kadr z filmu i opis. Pełny plik odtwarzasz tutaj." },
  { id: "music", label: "Muzyka", desc: "Sekwencer, WAV i biblioteka utworów." },
  { id: "code", label: "Kod", desc: "Qwen Coder na Oracle. Wynik możesz skopiować." },
];

function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 960 / Math.max(image.width, 1));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let quality = 0.72;
      let data = canvas.toDataURL("image/jpeg", quality);
      while (data.length > 170_000 && quality > 0.4) {
        quality -= 0.08;
        data = canvas.toDataURL("image/jpeg", quality);
      }
      if (data.length > 170_000) {
        reject(new Error("Zdjęcie jest za duże nawet po zmniejszeniu."));
        return;
      }
      resolve(data);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nie odczytam tego pliku."));
    };
    image.src = url;
  });
}

function posterFromVideo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const draw = () => {
      const canvas = document.createElement("canvas");
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;
      const scale = Math.min(1, 960 / width);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    video.onloadeddata = () => {
      if (video.duration && video.duration > 0.3) video.currentTime = 0.2;
      else draw();
    };
    video.onseeked = draw;
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nie odtworzę tego wideo."));
    };
  });
}

export function StudioClient({ initial = "post" }: { initial?: Tool }) {
  const [tool, setTool] = useState<Tool>(initial);
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [image, setImage] = useState("");
  const [clip, setClip] = useState("");
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      await apiFetch<Post>("/api/feed/posts", {
        method: "POST",
        body: {
          body: body.trim(),
          mediaUrl: image || undefined,
          audioDescription: tool === "video" ? body.trim() : undefined,
          tags: tags
            .split(/\s+/)
            .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 5),
        },
      });
      setBody("");
      setTags("");
      setImage("");
      setNote("Opublikowane na bengtok.");
    } catch (error) {
      setNote(error instanceof ApiRequestError ? error.error.message : "Nie udało się opublikować. Zaloguj się.");
    } finally {
      setBusy(false);
    }
  }

  async function askCoder(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !prompt.trim()) return;
    setBusy(true);
    setNote("");
    setCode("");
    try {
      if (readEngine()) {
        setCode(await askEngine(prompt.trim()));
        return;
      }
      const response = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "dev", messages: [{ role: "user", content: prompt.trim() }] }),
      });
      const data = (await response.json()) as { ok?: boolean; text?: string; content?: string; error?: string };
      if (!response.ok || !data.ok) {
        setNote(data.error || "Qwen nie odpowiedział. Sprawdź Ollamę na Oracle.");
        return;
      }
      setCode(data.text || data.content || "");
    } catch {
      setNote("Brak połączenia z asystentem kodu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-[var(--bengos-accent)]">Studio</h1>
        <p className="mt-1 text-[var(--bengos-text-muted)]">Post, kadr wideo, muzyka i kod. Publikacja idzie na bengtok.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTool(item.id)}
            className={
              "rounded-[var(--bengos-radius-card)] border p-4 text-left " +
              (tool === item.id
                ? "border-[var(--bengos-accent)] bg-[var(--bengos-surface-raised)]"
                : "border-[var(--bengos-border)]")
            }
          >
            <span className="block font-semibold">{item.label}</span>
            <span className="mt-1 block text-sm text-[var(--bengos-text-muted)]">{item.desc}</span>
          </button>
        ))}
      </div>

      {tool === "music" ? (
        <section className="bengos-surface-card space-y-3">
          <h2 className="text-xl">Muzyka</h2>
          <p className="text-[var(--bengos-text-muted)]">
            Sekwencer nagrywa utwór w przeglądarce i zapisuje WAV do biblioteki. Nie trzeba GPU.
          </p>
          <Link href="/studio/music" className="inline-flex min-h-11 items-center rounded-md bg-[var(--bengos-accent)] px-4 font-medium text-[var(--bengos-text-on-accent)]">
            Otwórz sekwencer
          </Link>
        </section>
      ) : null}

      {tool === "code" ? (
        <form onSubmit={askCoder} className="bengos-surface-card space-y-3">
          <h2 className="text-xl">Kod — Qwen Coder</h2>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Opisz funkcję, którą chcesz dostać."
            className="w-full rounded-md border border-[var(--bengos-border)] bg-transparent px-3 py-2"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-[var(--bengos-accent)] px-4 font-medium text-[var(--bengos-text-on-accent)] disabled:opacity-60">
              {busy ? "Piszę…" : "Generuj kod"}
            </button>
            <Link href="/dev" className="inline-flex min-h-11 items-center rounded-md border border-[var(--bengos-border)] px-4">
              Repozytoria i issue
            </Link>
          </div>
          {code ? (
            <pre className="overflow-x-auto rounded-md bg-black/40 p-3 text-sm text-[#b6ffe1]">
              <code>{code}</code>
            </pre>
          ) : null}
        </form>
      ) : null}

      {tool === "post" || tool === "video" ? (
        <form onSubmit={publish} className="bengos-surface-card space-y-3">
          <h2 className="text-xl">{tool === "video" ? "Wideo" : "Post"}</h2>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={tool === "video" ? "Opis filmu. Ten sam tekst jest opisem dźwiękowym." : "Co publikujesz?"}
            className="w-full rounded-md border border-[var(--bengos-border)] bg-transparent px-3 py-2"
          />
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="tagi po spacji"
            className="w-full rounded-md border border-[var(--bengos-border)] bg-transparent px-3 py-2"
          />
          {tool === "post" ? (
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void shrinkImage(file).then(setImage).catch((error: Error) => setNote(error.message));
              }}
            />
          ) : (
            <input
              type="file"
              accept="video/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setClip(URL.createObjectURL(file));
                void posterFromVideo(file).then(setImage).catch((error: Error) => setNote(error.message));
              }}
            />
          )}
          {clip && tool === "video" ? <video src={clip} controls className="max-h-64 w-full rounded-md" /> : null}
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="max-h-64 rounded-md object-contain" />
          ) : null}
          <p className="text-sm text-[var(--bengos-text-muted)]">
            {tool === "video"
              ? "Na bengtok idzie kadr i opis. Cały plik odtwarza się tylko w tym oknie — serwer nie trzyma wideo."
              : "Zdjęcie jest zmniejszane w przeglądarce i publikowane razem z tekstem."}
          </p>
          <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-[var(--bengos-accent)] px-4 font-medium text-[var(--bengos-text-on-accent)] disabled:opacity-60">
            {busy ? "Wysyłam…" : "Opublikuj"}
          </button>
        </form>
      ) : null}

      {note ? <p className="text-sm text-[var(--bengos-text-muted)]">{note}</p> : null}
    </div>
  );
}
