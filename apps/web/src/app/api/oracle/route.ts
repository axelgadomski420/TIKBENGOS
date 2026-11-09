const ASSISTANT_MODEL = "phi4-mini";
const DEV_MODEL = "qwen2.5-coder:7b";

function bases(): string[] {
  const configured = process.env.OLLAMA_URL?.trim();
  return [...new Set([configured, "http://host.docker.internal:11434", "http://ollama:11434"].filter(Boolean))] as string[];
}

async function tags(base: string): Promise<string[]> {
  const res = await fetch(`${base}/api/tags`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(String(res.status));
  const body = (await res.json()) as { models?: { name?: string }[] };
  return (body.models ?? []).map((model) => model.name ?? "").filter(Boolean);
}

function pick(models: string[], preferred: string, needle: string): string {
  return (
    models.find((name) => name === preferred || name.startsWith(`${preferred}`) ) ??
    models.find((name) => name.toLowerCase().includes(needle)) ??
    preferred
  );
}

export async function GET() {
  let last = "Ollama nie odpowiada.";
  for (const base of bases()) {
    try {
      const models = await tags(base);
      return Response.json({ ok: true, base, models });
    } catch (error) {
      last = error instanceof Error ? error.message : last;
    }
  }
  return Response.json({ ok: false, error: last, models: [] }, { status: 502 });
}

export async function POST(request: Request) {
  let payload: { mode?: string; messages?: { role?: string; content?: string }[] };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ ok: false, error: "Złe żądanie." }, { status: 400 });
  }
  const mode = payload.mode === "dev" ? "dev" : "assistant";
  const messages = (payload.messages ?? [])
    .filter((item) => (item.role === "user" || item.role === "assistant") && item.content?.trim())
    .slice(-8)
    .map((item) => ({ role: item.role as "user" | "assistant", content: item.content!.trim().slice(0, 8000) }));
  if (!messages.length) return Response.json({ ok: false, error: "Pusta wiadomość." }, { status: 400 });

  const preferred = mode === "dev" ? DEV_MODEL : ASSISTANT_MODEL;
  const needle = mode === "dev" ? "qwen2.5-coder" : "phi4";
  const system =
    mode === "dev"
      ? "Jesteś Qwen2.5-Coder na Oracle. Zwróć wyłącznie kod. Jeśli nie podano języka, użyj Pythona. Pierwsza linia to komentarz z opisem. Bez wstępu."
      : "Jesteś asystentem Bengos.PL. Silnik to Phi-4-mini na Oracle, nie Llama. Odpowiadaj po polsku, krótko i konkretnie.";

  let last = "Ollama nie odpowiada.";
  for (const base of bases()) {
    try {
      let models: string[] = [];
      try {
        models = await tags(base);
      } catch {
        models = [];
      }
      const model = pick(models, preferred, needle);
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(mode === "dev" ? 120000 : 50000),
        body: JSON.stringify({
          model,
          stream: false,
          messages: [{ role: "system", content: system }, ...messages],
          options: { temperature: mode === "dev" ? 0.2 : 0.4, num_predict: mode === "dev" ? 1400 : 700 },
        }),
      });
      if (!res.ok) {
        last = res.status === 404 ? `Na Oracle nie ma modelu ${model}.` : `Ollama odpowiedziała ${res.status}.`;
        continue;
      }
      const body = (await res.json()) as { message?: { content?: string } };
      const text = body.message?.content?.trim() ?? "";
      if (!text) {
        last = "Pusta odpowiedź modelu.";
        continue;
      }
      return Response.json({ ok: true, text, model });
    } catch (error) {
      last = error instanceof Error ? error.message : last;
    }
  }
  return Response.json({ ok: false, error: last }, { status: 502 });
}
