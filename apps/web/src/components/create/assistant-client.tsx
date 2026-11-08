"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

// Kształty lokalne, bo kontrakt (packages/core/src/ai.ts) eksportuje
// te same pola — komponent czyta tylko to, czego naprawdę używa.
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

/**
 * Panel asystenta: pytanie, status zadania, historia.
 *
 * Odpowiedź NIE powstaje w tym komponencie — przychodzi z workera modelu
 * przez serwer. Dlatego po wysłaniu pytania jest status, a nie spinner
 * z zmyślonym postępem: „myśli" to stan z serwera albo nic.
 */
export function AssistantClient() {
  const { isAuthenticated } = useSession();
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
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
      // Historia to podgląd — jej chwilowy brak nie jest błędem panelu
      // i nie ma prawa blokować zadania pytania.
    }
  }, []);

  // Czyszczenie licznika przy odmontowaniu: zapętlenie odpytywania po
  // wyjściu ze strony pamiętałoby zadanie, którego użytkownik nie widzi.
  useEffect(() => {
    if (isAuthenticated) void loadHistory();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isAuthenticated, loadHistory]);

  const pollStatus = useCallback(
    async (id: string) => {
      try {
        const data = await apiFetch<JobStatus>("/api/ai/jobs/" + id);
        setStatus(data);
        if (data.state === "queued" || data.state === "running") {
          timer.current = setTimeout(() => void pollStatus(id), 3000);
        } else {
          // Stan terminalny: odpowiedź ląduje w historii, więc to ją
          // odświeżamy — status zadania odpowiedzi nie niesie.
          void loadHistory();
        }
      } catch {
        setStatus(null);
      }
    },
    [loadHistory],
  );

  async function ask() {
    setBusy(true);
    setMessage(null);
    try {
      const data = await apiFetch<{ jobId: string }>("/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      setJobId(data.jobId);
      setStatus({ state: "queued" });
      setPrompt("");
      timer.current = setTimeout(() => void pollStatus(data.jobId), 2000);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        // 503 bez modelu to PRAWDA z serwera — powtarzamy ją dosłownie,
        // zamiast zamieniać na własny tekst, który niczego nie wyjaśnia.
        setMessage(error.error.message);
      } else {
        setMessage("Nie udało się wysłać pytania. Spróbuj ponownie.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <section aria-labelledby="assistant-title" className="bengos-surface-card mx-auto max-w-2xl">
        <h2
          id="assistant-title"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Asystent
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Zaloguj się, żeby zapytać asystenta. Pytania i odpowiedzi są Twoje —
          historia działa na koncie, nie w przeglądarce.
        </p>
      </section>
    );
  }

  const running = status?.state === "queued" || status?.state === "running";

  return (
    <section aria-labelledby="assistant-title" className="bengos-surface-card mx-auto max-w-2xl">
      <h2
        id="assistant-title"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Asystent
      </h2>
      <p className="bengos-eyebrow mt-1">Pyta model, nie udaje myślącego</p>

      <label htmlFor="assistant-prompt" className="bengos-visually-hidden">
        Twoje pytanie
      </label>
      <textarea
        id="assistant-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        maxLength={4000}
        rows={4}
        placeholder="Np.: jakie pomysły na wideo do mojego ostatniego utworu?"
        className="mt-4 w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] p-3 text-[var(--bengos-size-caption)] focus:border-[var(--bengos-border-strong)] focus:outline-none"
      />

      <button
        type="button"
        onClick={() => void ask()}
        disabled={busy || running || prompt.trim().length === 0}
        className="bengos-touch-target mt-3 inline-flex items-center justify-center rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-semibold)] text-[var(--bengos-text-on-accent)] disabled:opacity-50"
      >
        {running ? "Model myśli…" : "Zapytaj"}
      </button>

      {message ? (
        <p className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]">{message}</p>
      ) : null}

      {status && running ? (
        <p className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          {status.stage || "Zadanie w kolejce"}
          {typeof status.progress === "number" && status.progress > 0
            ? " — " + Math.round(status.progress * 100) + "%"
            : ""}
        </p>
      ) : null}
      {status?.state === "failed" && status.error ? (
        <p className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]">
          {status.error.message}
        </p>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
            Historia
          </h3>
          <ul className="mt-2 space-y-3">
            {history.map((item) => (
              <li
                key={item.id}
                className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] p-3"
              >
                <p className="font-[var(--bengos-weight-medium)]">{item.prompt}</p>
                {item.answer ? (
                  <p className="mt-1 whitespace-pre-wrap text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                    {item.answer}
                  </p>
                ) : (
                  <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                    {item.state === "failed" ? "Nieudane" : "Bez odpowiedzi — czeka na model"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
