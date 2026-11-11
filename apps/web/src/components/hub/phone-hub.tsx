"use client";

import { useEffect, useState } from "react";

import "./phone-hub.css";
import { askEngine, readEngine } from "@/lib/engine-client";

type Tab = "dev" | "asystent" | "profil" | "ustawienia";
type Turn = { id: string; role: "user" | "assistant"; text: string };
type Live = { phase: "laczenie" | "gotowy" | "brak"; detail: string; models: string[] };

const PLACEHOLDER = `# Opis: stwórz funkcję w Pythonie, która oblicza ciąg Fibonacciego
# Wygenerowano przez Qwen2.5-Coder

def generated_function():
    """
    Tu pojawi się wygenerowany kod.
    Model: qwen2.5-coder:7b
    """
    pass
`;

const WELCOME = "Cześć! Jestem Twoim asystentem AI. Jak mogę Ci pomóc?";

function Mark() {
  return (
    <svg className="phone-mark" viewBox="0 0 64 64" aria-hidden>
      <path
        fill="#2f7bff"
        d="M12 8h16.2c6.6 0 11 3.7 11 9 0 3.3-1.8 6-4.8 7.3 4 1.3 6.5 4.4 6.5 8.4 0 5.8-5 9.8-12.2 9.8H12V8zm6.4 6.6v8.4H28c2.8 0 4.6-1.5 4.6-4.2s-1.8-4.2-4.6-4.2H18.4zm0 14.2v9.6h10.4c3.3 0 5.5-1.8 5.5-4.8s-2.2-4.8-5.5-4.8H18.4z"
      />
      <path d="M49 24c3.2 2.2 3.2 7.6 0 9.8" fill="none" stroke="#8ec8ff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M53.2 19.5c5 3.4 5 13.2 0 16.6" fill="none" stroke="#5aa6ff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M57.4 15c6.8 4.6 6.8 19 0 23.6" fill="none" stroke="#2f7bff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function PhoneHub() {
  const [tab, setTab] = useState<Tab>("asystent");
  const [live, setLive] = useState<Live>({ phase: "laczenie", detail: "", models: [] });
  const [turns, setTurns] = useState<Turn[]>([{ id: "witaj", role: "assistant", text: WELCOME }]);
  const [text, setText] = useState("");
  const [code, setCode] = useState(PLACEHOLDER);
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let stop = false;
    async function ping() {
      try {
        const res = await fetch("/api/oracle");
        const body = (await res.json()) as { ok?: boolean; models?: string[]; error?: string };
        if (stop) return;
        if (body.ok) setLive({ phase: "gotowy", detail: "oracle", models: body.models ?? [] });
        else setLive({ phase: "brak", detail: body.error ?? "brak", models: [] });
      } catch {
        if (!stop) setLive({ phase: "brak", detail: "brak polaczenia", models: [] });
      }
    }
    void ping();
    return () => {
      stop = true;
    };
  }, []);

  async function ask(mode: "assistant" | "dev", messages: { role: "user" | "assistant"; content: string }[]) {
    if (readEngine()) {
      try {
        const text = await askEngine(messages.map((item) => `${item.role}: ${item.content}`).join("\n"));
        return { ok: true, text };
      } catch {
        // Własny klucz nie zadziałał — zostaje model na Oracle.
      }
    }
    const res = await fetch("/api/oracle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, messages }),
    });
    return (await res.json()) as { ok: boolean; text?: string; error?: string };
  }

  async function sendAssistant() {
    const content = text.trim();
    if (!content || busy) return;
    setText("");
    const history = [...turns, { id: crypto.randomUUID(), role: "user" as const, text: content }].slice(-8);
    setTurns(history);
    setBusy(true);
    try {
      const res = await ask(
        "assistant",
        history.map((turn) => ({ role: turn.role, content: turn.text })),
      );
      setTurns([
        ...history,
        { id: crypto.randomUUID(), role: "assistant", text: res.ok ? (res.text ?? "") : (res.error ?? "Brak odpowiedzi.") },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function sendDev() {
    const idea = prompt.trim();
    if (!idea || busy) return;
    setBusy(true);
    setNote("");
    try {
      const res = await ask("dev", [{ role: "user", content: idea }]);
      if (!res.ok || !res.text) setNote(res.error ?? "Qwen nie odpowiedział.");
      else {
        const fenced = res.text.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/);
        setCode((fenced?.[1] ?? res.text).trim());
        setReady(true);
      }
    } finally {
      setBusy(false);
    }
  }

  const status = busy ? "PISZE" : ready && tab === "dev" && live.phase === "gotowy" ? "KOD GOTOWY" : live.phase === "gotowy" ? "GOTOWY" : live.phase === "brak" ? "BRAK LACZA" : "ŁĄCZENIE";
  const ok = status === "GOTOWY" || status === "KOD GOTOWY";

  return (
    <div className="phone">
      <header className="phone-top">
        <Mark />
        <div style={{ flex: 1 }}>
          <p className="phone-name">Bengos.PL</p>
          <p className="phone-sub">Multi-AI Hub</p>
        </div>
        <span className="phone-icon" aria-label={live.phase === "gotowy" ? "Oracle gotowy" : "Oracle offline"}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={live.phase === "gotowy" ? "#3ddc84" : "#93a0b5"} strokeWidth="2">
            <path d="M4 18v-3M9 18v-7M14 18V8M19 18V4" />
          </svg>
        </span>
      </header>
      <main className="phone-main">
        {tab === "asystent" && (
          <>
            <h1 className="phone-title">Asystent AI</h1>
            <section className="phone-card">
              <p className="phone-kicker">BENGOS.PL</p>
              <h2>ASYSTENT</h2>
              <p className="phone-meta">
                MODEL: PHI4-MINI
                <br />
                STATUS: <span className={ok ? "phone-ok" : "phone-bad"}>{status}</span>
                <br />
                PORT: 11434
              </p>
            </section>
            {turns.map((turn) => (
              <article key={turn.id} className={turn.role === "user" ? "phone-bubble phone-me" : "phone-bubble"}>
                {turn.text}
              </article>
            ))}
          </>
        )}
        {tab === "dev" && (
          <>
            <h1 className="phone-title">DEV — Qwen Coder</h1>
            <section className="phone-card">
              <p className="phone-kicker">DEV</p>
              <h2>QWEN CODER 2.5</h2>
              <p className="phone-meta">
                MODEL: QWEN2.5-CODER:7B
                <br />
                STATUS: <span className={ok ? "phone-ok" : "phone-bad"}>{status}</span>
                <br />
                PORT: 11434
              </p>
            </section>
            <pre className="phone-code">{code}</pre>
            <p className="phone-ready">{busy ? "QWEN PISZE KOD" : "KOD GOTOWY DO KOPIOWANIA"}</p>
            {note && <p className="phone-bad">{note}</p>}
            <div className="phone-pair">
              <button type="button" className="phone-green" onClick={() => void navigator.clipboard.writeText(code)}>
                Kopiuj kod
              </button>
              <button
                type="button"
                className="phone-blue"
                onClick={() => {
                  setCode(PLACEHOLDER);
                  setReady(false);
                  setPrompt("");
                  setNote("");
                }}
              >
                Nowy prompt
              </button>
            </div>
          </>
        )}
        {tab === "profil" && (
          <>
            <h1 className="phone-title">Profil</h1>
            <section className="phone-card">
              <p className="phone-kicker">BENGOS.PL</p>
              <h2>OPERATOR</h2>
              <p className="phone-meta">
                MULTI-AI HUB
                <br />
                STATUS: <span className={live.phase === "gotowy" ? "phone-ok" : "phone-bad"}>{live.phase === "gotowy" ? "GOTOWY" : "BRAK LACZA"}</span>
              </p>
            </section>
            <article className="phone-bubble">
              <p className="phone-kicker">ASYSTENT</p>
              <h2>PHI-4-MINI</h2>
            </article>
            <article className="phone-bubble">
              <p className="phone-kicker">DEV</p>
              <h2>QWEN CODER 2.5</h2>
            </article>
            {!!live.models.length && (
              <article className="phone-bubble">
                <p className="phone-kicker">MODELE</p>
                <ul>
                  {live.models.map((model) => (
                    <li key={model}>{model}</li>
                  ))}
                </ul>
              </article>
            )}
          </>
        )}
        {tab === "ustawienia" && (
          <>
            <h1 className="phone-title">Ustawienia</h1>
            <section className="phone-card">
              <p className="phone-kicker">ORACLE</p>
              <h2>POŁĄCZENIE</h2>
              <p className="phone-meta">
                PORT: 11434
                <br />
                HOST: 92.5.154.243
                <br />
                STATUS: <span className={live.phase === "gotowy" ? "phone-ok" : "phone-bad"}>{live.phase === "gotowy" ? "GOTOWY" : live.detail || "ŁĄCZENIE"}</span>
              </p>
              <p className="phone-sub">Asystent woła phi4-mini, DEV woła qwen2.5-coder:7b. Oba siedzą na tej maszynie.</p>
            </section>
          </>
        )}
      </main>
      {(tab === "asystent" || tab === "dev") && (
        <form
          className="phone-composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (tab === "dev") void sendDev();
            else void sendAssistant();
          }}
        >
          <input
            value={tab === "dev" ? prompt : text}
            onChange={(event) => (tab === "dev" ? setPrompt(event.target.value) : setText(event.target.value))}
            placeholder={tab === "dev" ? "Opisz co chcesz zbudować..." : "Napisz wiadomość do asystenta..."}
            aria-label={tab === "dev" ? "Prompt do Qwen" : "Wiadomość do asystenta"}
            disabled={busy}
          />
          <button className="phone-round phone-send" type="submit" aria-label="Wyślij" disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m5 12 14-7-4 14-3-5z" />
            </svg>
          </button>
        </form>
      )}
      <nav className="phone-tabs" aria-label="Bengos">
        {(
          [
            ["dev", "DEV"],
            ["asystent", "ASISTENT"],
            ["profil", "PROFIL"],
            ["ustawienia", "USTAWIENIA"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
