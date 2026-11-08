"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

interface HistoryItem {
  id: string;
  prompt: string;
  answer: string;
  state: string;
  createdAt: string;
}

interface JobStatus {
  state: string;
  stage?: string;
  progress?: number;
  error?: { code: string; message: string };
}

export function AssistantClient() {
  const { isAuthenticated } = useSession();
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: HistoryItem[] }>("/api/ai/history");
      setHistory(data.items);
    } catch {
      setHistory([]);
    }
  }, []);

  const pollStatus = useCallback(async (id: string) => {
    try {
      const data = await apiFetch<JobStatus>("/api/ai/jobs/" + id);
      setStatus(data);
      if (data.state === "queued" || data.state === "running") {
        timer.current = setTimeout(() => void pollStatus(id), 2500);
      } else {
        await loadHistory();
      }
    } catch (error) {
      setMessage(error instanceof ApiRequestError ? error.error.message : "Nie udało się sprawdzić stanu zadania.");
      setStatus(null);
    }
  }, [loadHistory]);

  useEffect(() => {
    if (isAuthenticated) void loadHistory();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isAuthenticated, loadHistory]);

  async function ask() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || busy) return;
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    setMessage(null);
    setStatus(null);
    try {
      const data = await apiFetch<{ jobId: string }>("/api/ai/assistant", {
        method: "POST",
        body: { prompt: cleanPrompt },
      });
      setPrompt("");
      setStatus({ state: "queued" });
      timer.current = setTimeout(() => void pollStatus(data.jobId), 1000);
      await loadHistory();
    } catch (error) {
      setMessage(error instanceof ApiRequestError ? error.error.message : "Nie udało się wysłać polecenia.");
    } finally {
      setBusy(false);
    }
  }

  const running = status?.state === "queued" || status?.state === "running";

  if (!isAuthenticated) {
    return (
      <section aria-labelledby="assistant-title" className="bengos-surface-card mx-auto w-full max-w-3xl">
        <p className="bengos-eyebrow">BENGOS AI</p>
        <h2 id="assistant-title" className="mt-1 text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Pluter — asystent BENGOS</h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">Zaloguj się, aby rozpocząć rozmowę z Pluterem.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="assistant-title" className="bengos-surface-card mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="bengos-eyebrow">BENGOS AI · Pluter</p>
          <h2 id="assistant-title" className="mt-1 text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Co chcesz zrobić?</h2>
          <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">Zapytaj, napisz tekst lub kod. Aktualne wyszukiwanie działa po skonfigurowaniu Tavily przez operatora.</p>
        </div>
        <span className="rounded-full border border-[var(--bengos-border)] px-3 py-1 text-[var(--bengos-size-caption)]">Pluter.js</span>
      </div>
      <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
        <label htmlFor="assistant-prompt" className="sr-only">Polecenie dla Plutera</label>
        <textarea id="assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={4000} rows={4} placeholder="Napisz scenariusz krótkiego wideo o podróży pociągiem…" className="w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] p-3 focus:border-[var(--bengos-accent)]" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">Odpowiedź generuje skonfigurowany model serwerowy.</p>
          <button type="submit" disabled={busy || running || prompt.trim().length === 0} className="bengos-touch-target rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-5 font-[var(--bengos-weight-semibold)] text-[var(--bengos-text-on-accent)] disabled:opacity-50">{busy ? "Wysyłam…" : running ? "Pluter pracuje…" : "Zapytaj Plutera"}</button>
        </div>
      </form>
      {message ? <p role="alert" className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]">{message}</p> : null}
      {running ? <p role="status" className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">{status?.stage || "Zadanie w kolejce"}{typeof status?.progress === "number" && status.progress > 0 ? ` · ${Math.round(status.progress * 100)}%` : ""}</p> : null}
      {status?.state === "failed" ? <p role="alert" className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]">{status.error?.message || "Zadanie nie powiodło się."}</p> : null}
      {history.length > 0 ? (
        <div className="mt-7 space-y-3">
          <h3 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Ostatnie rozmowy</h3>
          <ul className="space-y-3">
            {history.slice(0, 5).map((item) => (
              <li key={item.id} className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] p-4">
                <p className="font-[var(--bengos-weight-medium)]">{item.prompt}</p>
                {item.answer ? <p className="mt-2 whitespace-pre-wrap text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">{item.answer}</p> : <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">{item.state === "failed" ? "Nieudane" : "Oczekiwanie na odpowiedź modelu"}</p>}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
