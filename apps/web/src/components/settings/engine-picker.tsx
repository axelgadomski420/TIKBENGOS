"use client";

import { useEffect, useMemo, useState } from "react";

import { ENGINE_ROUTES, PROVIDERS } from "@bengos/core";

import { ApiRequestError, apiFetch } from "@/lib/api-client";
import { readEngine, writeEngine, type EngineChoice } from "@/lib/engine-client";
import { useSession } from "@/lib/session-context";

const FEATURED = ["xai", "google-ai", "openai", "anthropic"];

export function EnginePicker() {
  const { isAuthenticated } = useSession();
  const [choice, setChoice] = useState<EngineChoice>({
    providerId: "xai",
    routeId: "xai-chat",
    model: "grok-4.7",
  });
  const [saved, setSaved] = useState(false);
  const [probe, setProbe] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = readEngine();
    if (stored) setChoice(stored);
  }, []);

  const routes = useMemo(
    () => ENGINE_ROUTES.filter((route) => route.providerId === choice.providerId),
    [choice.providerId],
  );
  const route = routes.find((item) => item.id === choice.routeId) ?? routes[0];
  const provider = PROVIDERS.find((item) => item.id === choice.providerId);
  const fullUrl =
    provider?.baseUrl && route
      ? `${provider.baseUrl.replace(/\/$/, "")}/${route.path.replace("{model}", choice.model)}`
      : "";

  function pickProvider(providerId: string) {
    const next = ENGINE_ROUTES.find((item) => item.providerId === providerId);
    if (!next) return;
    const model = next.models[0]?.id;
    if (!model) return;
    setSaved(false);
    setChoice({ providerId, routeId: next.id, model });
  }

  function pickRoute(routeId: string) {
    const next = routes.find((item) => item.id === routeId);
    if (!next) return;
    const model = next.models[0]?.id;
    if (!model) return;
    setSaved(false);
    setChoice({ ...choice, routeId: next.id, model });
  }

  function remember() {
    if (!route) return;
    writeEngine({ providerId: choice.providerId, routeId: route.id, model: choice.model });
    setSaved(true);
  }

  return (
    <section className="bengos-surface-card space-y-4">
      <div>
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Twój silnik</h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Każdy wkłada własny klucz. Endpointy są z 9 listopada 2026 — wybierasz ścieżkę i model, adresu nie wpisujesz ręcznie.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {FEATURED.map((id) => {
          const item = PROVIDERS.find((entry) => entry.id === id);
          const active = choice.providerId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => pickProvider(id)}
              className={
                "min-h-16 rounded-md border px-3 py-2 text-left " +
                (active ? "border-[#7ef6ff] text-[#7ef6ff]" : "border-[var(--bengos-border)]")
              }
            >
              <span className="block font-semibold">{item?.name}</span>
              <span className="block text-xs text-[var(--bengos-text-muted)]">{item?.baseUrl}</span>
            </button>
          );
        })}
      </div>
      <label className="block text-sm">
        Wszyscy dostawcy z katalogu
        <select
          value={choice.providerId}
          onChange={(event) => pickProvider(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-[var(--bengos-border)] bg-transparent px-3"
        >
          {[...new Set(ENGINE_ROUTES.map((item) => item.providerId))].map((id) => (
            <option key={id} value={id}>
              {PROVIDERS.find((item) => item.id === id)?.name ?? id}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Endpoint
        <select
          value={route?.id ?? ""}
          onChange={(event) => pickRoute(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-[var(--bengos-border)] bg-transparent px-3"
        >
          {routes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Model
        <select
          value={choice.model}
          onChange={(event) => {
            setSaved(false);
            setChoice({ ...choice, model: event.target.value });
          }}
          className="mt-1 min-h-11 w-full rounded-md border border-[var(--bengos-border)] bg-transparent px-3"
        >
          {(route?.models ?? []).map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>
      <p className="break-all font-mono text-xs text-[var(--bengos-text-muted)]">{fullUrl}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-md bg-[var(--bengos-accent)] px-4 font-medium text-[var(--bengos-text-on-accent)]"
          onClick={remember}
        >
          Używaj tego silnika
        </button>
        <button
          type="button"
          disabled={!isAuthenticated || busy}
          className="min-h-11 rounded-md border border-[var(--bengos-border)] px-4 disabled:opacity-50"
          onClick={() => {
            if (!route) return;
            remember();
            setBusy(true);
            setProbe("");
            void apiFetch<{ text: string }>("/api/ai/engine", {
              method: "POST",
              body: {
                providerId: choice.providerId,
                routeId: route.id,
                model: choice.model,
                prompt: "Odpowiedz jednym słowem: gotowe.",
              },
            })
              .then((data) => setProbe(data.text))
              .catch((error: unknown) =>
                setProbe(error instanceof ApiRequestError ? error.error.message : "Nie udało się sprawdzić klucza."),
              )
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Sprawdzam…" : "Sprawdź mój klucz"}
        </button>
      </div>
      {saved ? (
        <p className="text-sm text-[#7ef6ff]">
          Asystent i studio biorą ten model. Bez klucza albo gdy dostawca nie odpowie, zostaje Phi-4 i Qwen na Oracle.
        </p>
      ) : null}
      {probe ? <p className="text-sm text-[var(--bengos-text-muted)]">{probe}</p> : null}
    </section>
  );
}
