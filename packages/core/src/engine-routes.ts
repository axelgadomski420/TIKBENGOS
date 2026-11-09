/**
 * Endpointy modeli na 9 listopada 2026.
 *
 * Adres składa się wyłącznie z katalogu: baza dostawcy + jedna z tych ścieżek.
 * Użytkownik wybiera endpoint i model, ale nie wpisuje własnego URL —
 * inaczej serwer dałoby się wysłać na adres wewnętrzny.
 */
export interface EngineModel {
  id: string;
  label: string;
}

export interface EngineRoute {
  id: string;
  providerId: string;
  label: string;
  path: string;
  protocol: "openai-chat" | "gemini" | "anthropic" | "xai-responses";
  models: readonly EngineModel[];
}

export const ENGINE_ROUTES: readonly EngineRoute[] = [
  {
    id: "openai-chat",
    providerId: "openai",
    label: "Chat Completions",
    path: "chat/completions",
    protocol: "openai-chat",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5" },
      { id: "gpt-5.5-pro", label: "GPT-5.5 Pro" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
      { id: "gpt-5.4-nano", label: "GPT-5.4 nano" },
    ],
  },
  {
    id: "xai-chat",
    providerId: "xai",
    label: "Chat Completions",
    path: "chat/completions",
    protocol: "openai-chat",
    models: [
      { id: "grok-4.7", label: "Grok 4.7" },
      { id: "grok-4.6", label: "Grok 4.6" },
      { id: "grok-4.20-beta-latest-non-reasoning", label: "Grok 4.20" },
      { id: "grok-4.1-fast", label: "Grok 4.1 Fast" },
    ],
  },
  {
    id: "xai-responses",
    providerId: "xai",
    label: "Responses",
    path: "responses",
    protocol: "xai-responses",
    models: [
      { id: "grok-4.7", label: "Grok 4.7" },
      { id: "grok-4.20-beta-latest-non-reasoning", label: "Grok 4.20" },
    ],
  },
  {
    id: "gemini-generate",
    providerId: "google-ai",
    label: "generateContent",
    path: "v1beta/models/{model}:generateContent",
    protocol: "gemini",
    models: [
      { id: "gemini-4-argon", label: "Gemini 4 Argon" },
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
    ],
  },
  {
    id: "gemini-openai",
    providerId: "google-ai",
    label: "OpenAI-compatible",
    path: "v1beta/openai/chat/completions",
    protocol: "openai-chat",
    models: [
      { id: "gemini-4-argon", label: "Gemini 4 Argon" },
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
    ],
  },
  {
    id: "anthropic-messages",
    providerId: "anthropic",
    label: "Messages",
    path: "v1/messages",
    protocol: "anthropic",
    models: [
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    ],
  },
  {
    id: "mistral-chat",
    providerId: "mistral",
    label: "Chat Completions",
    path: "chat/completions",
    protocol: "openai-chat",
    models: [
      { id: "mistral-large-latest", label: "Mistral Large" },
      { id: "mistral-small-latest", label: "Mistral Small" },
    ],
  },
  {
    id: "deepseek-chat",
    providerId: "deepseek",
    label: "Chat Completions",
    path: "chat/completions",
    protocol: "openai-chat",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    id: "groq-chat",
    providerId: "groq",
    label: "Chat Completions",
    path: "chat/completions",
    protocol: "openai-chat",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    ],
  },
  {
    id: "openrouter-chat",
    providerId: "openrouter",
    label: "Chat Completions",
    path: "chat/completions",
    protocol: "openai-chat",
    models: [
      { id: "x-ai/grok-4.7", label: "Grok 4.7 przez OpenRouter" },
      { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash przez OpenRouter" },
      { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini przez OpenRouter" },
    ],
  },
];

export function routesFor(providerId: string): EngineRoute[] {
  return ENGINE_ROUTES.filter((route) => route.providerId === providerId);
}
