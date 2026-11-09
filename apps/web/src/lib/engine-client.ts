import { ENGINE_ROUTES, type EngineRoute } from "@bengos/core";

import { apiFetch } from "@/lib/api-client";

export interface EngineChoice {
  providerId: string;
  routeId: string;
  model: string;
}

const KEY = "bengos-engine-v1";

export function readEngine(): EngineChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as EngineChoice | null;
    if (!raw) return null;
    const route = ENGINE_ROUTES.find((item) => item.id === raw.routeId && item.providerId === raw.providerId);
    if (!route || !route.models.some((model) => model.id === raw.model)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeEngine(choice: EngineChoice) {
  localStorage.setItem(KEY, JSON.stringify(choice));
}

export function routeById(id: string): EngineRoute | undefined {
  return ENGINE_ROUTES.find((route) => route.id === id);
}

export async function askEngine(prompt: string): Promise<string> {
  const choice = readEngine();
  if (!choice) throw new Error("Nie wybrano silnika.");
  const data = await apiFetch<{ text: string }>("/api/ai/engine", {
    method: "POST",
    body: { ...choice, prompt },
  });
  return data.text;
}
