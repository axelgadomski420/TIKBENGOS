/**
 * Katalog dostawców zewnętrznych.
 *
 * Ten plik jest jedynym źródłem prawdy o tym, jak nazywają się dostawcy,
 * gdzie mają API i jak przyjmują klucz. Używa go interfejs (rozwijana lista
 * w ustawieniach) i serwer (walidacja przy zapisie klucza).
 *
 * `baseUrl` NIGDY nie pochodzi od użytkownika. To jest cała obrona przed
 * SSRF: gdyby adres wpisywał użytkownik, mógłby podać `http://169.254.169.254/`
 * (metadane chmury) albo `http://localhost:8000` (nasze własne API) i kazać
 * serwerowi wysłanie tam żądanie z jego kluczem. Adresy są zaszyte tutaj,
 * a klucz służy wyłącznie do łączenia się z prawdziwym API dostawcy.
 *
 * Zasada weryfikacji: każde pole `baseUrl` ma datę w `verifiedAt` i adres
 * dokumentacji w `docsUrl`. Jeżeli czegoś nie potwierdzono dla aktualnej
 * wersji API, `baseUrl` jest `null`, a `note` mówi dlaczego. Wpis ze starym,
 * nieistniejącym adresem psuje aplikację po cichu — dlatego lepiej nie mieć
 * adresu wcale niż mieć niepewny.
 */

import type { ApiError } from "./api.js";

export type ProviderKind = "llm" | "image" | "audio" | "music" | "speech" | "code";

export type AuthStyle =
  /** `Authorization: Bearer <klucz>` */
  | "bearer"
  /** Własny nagłówek, np. `x-api-key: <klucz>` */
  | "api-key-header"
  /** Klucz w parametrze zapytania, np. `?key=<klucz>` */
  | "query";

export interface ProviderDefinition {
  id: string;
  name: string;
  kind: ProviderKind;
  /** Adres bazowy API. `null`, gdy nie potwierdzono dla aktualnej wersji API. */
  baseUrl: string | null;
  authStyle: AuthStyle;
  /** Nazwa nagłówka, gdy `authStyle` to `api-key-header`. */
  authHeader: string | null;
  docsUrl: string;
  /** Prefiksy, po których poznać kształt klucza. Pusty = brak potwierdzonego prefiksu. */
  keyPrefixes: string[];
  /** Data potwierdzenia adresu, ISO 8601. `null`, gdy adres niepotwierdzony. */
  verifiedAt: string | null;
  /** Jedno zdanie o tym, na co uważać. Po polsku, bo czyta to użytkownik. */
  note: string;
}

const VERIFIED = "2026-11-02";

/**
 * Dostawcy potwierdzeni w oficjalnej dokumentacji. Adresy sprawdzone
 * w dniu `VERIFIED`.
 */
export const PROVIDERS: readonly ProviderDefinition[] = [
  /* ─────────────────────────── Modele językowe ─────────────────────── */
  {
    id: "openai",
    name: "OpenAI",
    kind: "llm",
    baseUrl: "https://api.openai.com/v1",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://developers.openai.com/api/reference",
    keyPrefixes: ["sk-"],
    verifiedAt: VERIFIED,
    note: "Klucz daje dostęp do wszystkich modeli i generacji obrazów w jednym koncie.",
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    kind: "llm",
    baseUrl: "https://api.anthropic.com",
    authStyle: "api-key-header",
    authHeader: "x-api-key",
    docsUrl: "https://platform.claude.com/docs/en/api/overview",
    keyPrefixes: ["sk-ant-"],
    verifiedAt: VERIFIED,
    note: "Każde żądanie musi mieć też nagłówek `anthropic-version` z datą wersji API.",
  },
  {
    id: "google-ai",
    name: "Google AI (Gemini)",
    kind: "llm",
    baseUrl: "https://generativelanguage.googleapis.com",
    authStyle: "api-key-header",
    authHeader: "x-goog-api-key",
    docsUrl: "https://ai.google.dev/api",
    keyPrefixes: [],
    verifiedAt: VERIFIED,
    note: "Wersje: `v1beta` dla nowych funkcji, `v1` jako stabilna. Wybieraj świadomie.",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    kind: "llm",
    baseUrl: "https://api.mistral.ai/v1",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.mistral.ai/api/",
    keyPrefixes: [],
    verifiedAt: VERIFIED,
    note: "Europejski dostawca — dane pozostają w UE, co ma znaczenie przy RODO.",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "llm",
    baseUrl: "https://openrouter.ai/api/v1",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://openrouter.ai/docs/api/reference/authentication",
    keyPrefixes: ["sk-or-"],
    verifiedAt: VERIFIED,
    note: "Jeden klucz do wielu modeli — można ustawić limit środków na klucz.",
  },
  {
    id: "groq",
    name: "Groq",
    kind: "llm",
    baseUrl: "https://api.groq.com/openai/v1",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://console.groq.com/docs/api-reference",
    keyPrefixes: ["gsk_"],
    verifiedAt: VERIFIED,
    note: "Interfejs zgodny z OpenAI — ten sam kształt żądań.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    kind: "llm",
    baseUrl: "https://api.deepseek.com/v1",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://api-docs.deepseek.com/",
    keyPrefixes: ["sk-"],
    verifiedAt: VERIFIED,
    note: "Interfejs zgodny z OpenAI.",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    kind: "llm",
    baseUrl: "https://api.x.ai/v1",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.x.ai/docs/api-reference",
    keyPrefixes: ["xai-"],
    verifiedAt: VERIFIED,
    note: "Interfejs zgodny z OpenAI.",
  },
  {
    id: "together",
    name: "Together AI",
    kind: "llm",
    baseUrl: "https://api.together.xyz/v1",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.together.ai/reference",
    keyPrefixes: [],
    verifiedAt: VERIFIED,
    note: "Modele otwarte — obrazy i modele językowe pod tym samym kluczem.",
  },
  {
    id: "cohere",
    name: "Cohere",
    kind: "llm",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.cohere.com/reference/about",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Adres niepotwierdzony dla aktualnej wersji API — sprawdź dokumentację przed użyciem.",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    kind: "llm",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.perplexity.ai/api-reference",
    keyPrefixes: ["pplx-"],
    verifiedAt: null,
    note: "Adres niepotwierdzony dla aktualnej wersji API — sprawdź dokumentację przed użyciem.",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    kind: "llm",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.fireworks.ai/api-reference/introduction",
    keyPrefixes: ["fw_"],
    verifiedAt: null,
    note: "Adres niepotwierdzony dla aktualnej wersji API — sprawdź dokumentację przed użyciem.",
  },

  /* ───────────────────────────── Obrazy ────────────────────────────── */
  {
    id: "replicate",
    name: "Replicate",
    kind: "image",
    baseUrl: "https://api.replicate.com/v1",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://replicate.com/docs/reference/http",
    keyPrefixes: ["r8_"],
    verifiedAt: VERIFIED,
    note: "Token ma zawsze 40 znaków i zaczyna się od `r8_`. Uruchamia modele na wynajem — płatne od użycia.",
  },
  {
    id: "stability",
    name: "Stability AI",
    kind: "image",
    baseUrl: "https://api.stability.ai",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://platform.stability.ai/docs/api-reference",
    keyPrefixes: ["sk-"],
    verifiedAt: VERIFIED,
    note: "Aktualne endpointy siedzą pod `/v2beta`, nie pod `/v1` — stary adres daje 404.",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    kind: "image",
    baseUrl: "https://api-inference.huggingface.co",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://huggingface.co/docs/api-inference/index",
    keyPrefixes: ["hf_"],
    verifiedAt: VERIFIED,
    note: "Token musi mieć włączone uprawnienie „Make calls to Inference Providers”.",
  },
  {
    id: "black-forest-labs",
    name: "Black Forest Labs (Flux)",
    kind: "image",
    baseUrl: null,
    authStyle: "api-key-header",
    authHeader: "x-key",
    docsUrl: "https://docs.bfl.ai/",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Adres niepotwierdzony. Modele Flux są też dostępne przez Replicate jednym kluczem.",
  },

  /* ────────────────────────────── Mowa ─────────────────────────────── */
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    kind: "speech",
    baseUrl: "https://api.elevenlabs.io/v1",
    authStyle: "api-key-header",
    authHeader: "xi-api-key",
    docsUrl: "https://elevenlabs.io/docs/api-reference/authentication",
    keyPrefixes: [],
    verifiedAt: VERIFIED,
    note: "Nagłówek to `xi-api-key`, nie `Authorization` — najczystsza pomyłka przy tym dostawcy.",
  },
  {
    id: "deepgram",
    name: "Deepgram",
    kind: "speech",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://developers.deepgram.com/reference/",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Adres niepotwierdzony dla aktualnej wersji API — sprawdź dokumentację przed użyciem.",
  },
  {
    id: "assemblyai",
    name: "AssemblyAI",
    kind: "speech",
    baseUrl: null,
    authStyle: "api-key-header",
    authHeader: "authorization",
    docsUrl: "https://www.assemblyai.com/docs/api-reference/overview",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Adres niepotwierdzony. Uwaga: nagłówek nazywa się `authorization`, ale nie używa schematu Bearer.",
  },
  {
    id: "speechmatics",
    name: "Speechmatics",
    kind: "speech",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.speechmatics.com/",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Adres niepotwierdzony dla aktualnej wersji API — sprawdź dokumentację przed użyciem.",
  },
  {
    id: "playht",
    name: "PlayHT",
    kind: "speech",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.play.ht/reference/api-getting-started",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Adres niepotwierdzony. Wymaga też drugiego identyfikatora użytkownika, nie tylko klucza.",
  },

  /* ────────────────────────────── Muzyka ───────────────────────────── */
  {
    id: "suno",
    name: "Suno",
    kind: "music",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.sunoapi.org/",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Adres niepotwierdzony. Generacja muzyki w TIKBENGOS idzie własnym workerem (MusicGen), nie tym API.",
  },
  {
    id: "udio",
    name: "Udio",
    kind: "music",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://www.udio.com/",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Brak publicznego API do potwierdzenia — wpis istnieje tylko po to, żeby lista była kompletna.",
  },

  /* ─────────────────────────────── Kod ─────────────────────────────── */
  {
    id: "github",
    name: "GitHub",
    kind: "code",
    baseUrl: "https://api.github.com",
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.github.com/en/rest",
    keyPrefixes: ["ghp_", "github_pat_", "gho_", "ghu_", "ghs_"],
    verifiedAt: VERIFIED,
    note: "Do repozytoriów używaj aplikacji GitHub, nie tokena osobistego — token osobisty działa jako Ty i ma zbyt szeroki zakres.",
  },
  {
    id: "gitlab",
    name: "GitLab",
    kind: "code",
    baseUrl: "https://gitlab.com/api/v4",
    authStyle: "api-key-header",
    authHeader: "PRIVATE-TOKEN",
    docsUrl: "https://docs.gitlab.com/ee/api/rest/",
    keyPrefixes: ["glpat-"],
    verifiedAt: VERIFIED,
    note: "Nagłówek `PRIVATE-TOKEN`. Dla własnej instancji adres trzeba zmienić ręcznie.",
  },
  {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    kind: "llm",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://developers.cloudflare.com/workers-ai/",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Adres zawiera identyfikator konta użytkownika, więc nie da się go zaszycić w katalogu — potrzebne pole per użytkownik.",
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    kind: "llm",
    baseUrl: null,
    authStyle: "api-key-header",
    authHeader: "api-key",
    docsUrl: "https://learn.microsoft.com/en-us/azure/ai-services/openai/reference",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Adres zawiera nazwę własnego zasobu i wdrożenia — nie da się go zaszycić w katalogu.",
  },
  {
    id: "aws-bedrock",
    name: "AWS Bedrock",
    kind: "llm",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://docs.aws.amazon.com/bedrock/latest/APIReference/",
    keyPrefixes: ["AKIA"],
    verifiedAt: null,
    note: "Nie używa klucza API, a podpisu SigV4 z klucza i sekretu — ten model nie obsługuje pary kluczy.",
  },
  {
    id: "vertex-ai",
    name: "Google Vertex AI",
    kind: "llm",
    baseUrl: null,
    authStyle: "bearer",
    authHeader: null,
    docsUrl: "https://cloud.google.com/vertex-ai/docs/reference/rest",
    keyPrefixes: [],
    verifiedAt: null,
    note: "Uwierzytelnianie idzie przez konto usługi Google, nie przez klucz API — ten model nie obsługuje tej formy.",
  },
];

/** Nazwa grupy do pokazania użytkownikowi, po polsku. */
export const PROVIDER_KIND_LABELS: Record<ProviderKind, string> = {
  llm: "Modele językowe",
  image: "Obrazy",
  audio: "Dźwięk",
  music: "Muzyka",
  speech: "Mowa",
  code: "Kod i repozytoria",
};

export function findProvider(id: string): ProviderDefinition | null {
  return PROVIDERS.find((provider) => provider.id === id) ?? null;
}

/**
 * Walidacja kształtu klucza przed wysłaniem na serwer.
 *
 * Sprawdza tylko to, co da się sprawdzić bez łączenia się z dostawcą:
 * czy klucz nie jest pusty i czy zaczyna się tak, jak zaczynają się klucze
 * tego dostawcy. Świadomie NIE odrzucamy klucza, gdy nie znamy prefiksu —
 * dostawcy zmieniają formaty, a odrzucenie poprawnego klucza jest gorszym
 * błędem niż przepuszczenie dziwnego.
 */
export function validateProviderKey(providerId: string, key: string): ApiError | null {
  const provider = findProvider(providerId);
  if (!provider) {
    return {
      code: "bad_request",
      field: "providerId",
      message: "Nie znamy tego dostawcy. Wybierz jednego z listy.",
    };
  }

  const value = key.trim();
  if (!value) {
    return { code: "bad_request", field: "key", message: "Wklej klucz dostawcy." };
  }
  if (value.length < 8) {
    return { code: "bad_request", field: "key", message: "Ten klucz jest za krótki, żeby był prawdziwy." };
  }
  if (/\s/.test(value)) {
    return {
      code: "bad_request",
      field: "key",
      message: "Klucz nie może zawierać spacji — sprawdź, czy skopiowało się całe.",
    };
  }
  if (provider.keyPrefixes.length > 0 && !provider.keyPrefixes.some((prefix) => value.startsWith(prefix))) {
    return {
      code: "bad_request",
      field: "key",
      message: `Klucze tego dostawcy zaczynają się od ${provider.keyPrefixes.join(" albo ")}.`,
    };
  }
  return null;
}
