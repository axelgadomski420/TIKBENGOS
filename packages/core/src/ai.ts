/**
 * Kontrakt asystenta — jedno źródło prawdy dla panelu i serwera.
 *
 * Asystent jest asynchroniczny jak generacja muzyki (patrz music.ts):
 * pytanie tworzy zadanie (202), odpowiedź oddaje worker z modelem LLM
 * przez endpoint zwrotny /ai/jobs/{id}/complete. Bez ASSISTANT_LLM_ENDPOINT
 * pytanie dostaje 503 — serwer NIE generuje odpowiedzi „z ogólnej wiedzy”,
 * bo żadnej nie ma.
 */

export const ASSISTANT_PROMPT_MAX = 4000;
export const ASSISTANT_ANSWER_MAX = 20000;
export const ASSISTANT_HISTORY_PAGE = 30;

/** Wejście POST /v1/assistant. */
export interface AskAssistantIn {
  prompt: string;
}

/** Odpowiedź 202 na pytanie — identyfikator zadania, nie odpowiedź. */
export interface AskAssistantOut {
  jobId: string;
  channel: string;
  model: string;
}

/** Pozycja historii — odpowiedź jest pusta, dopóki worker jej nie odda. */
export interface AssistantJobOut {
  id: string;
  prompt: string;
  answer: string;
  state: string;
  createdAt: string;
}

/** Odpowiedź GET /v1/ai/history. */
export interface AssistantHistoryOut {
  items: AssistantJobOut[];
}

/** Raport workera LLM na endpoint zwrotny — z sekretem X-Bengos-Worker. */
export interface AssistantCompleteIn {
  state: "running" | "succeeded" | "failed";
  stage?: string;
  progress?: number;
  answer?: string;
  error?: string;
}
