/**
 * Kontrakty API TIKBENGOS.
 *
 * Jedno miejsce, w którym opisany jest kształt każdej odpowiedzi. Interfejs
 * i serwer odwołują się do tego samego typu, więc rozjazd między nimi jest
 * błędem kompilacji, a nie niespodzianką w produkcji.
 *
 * Zasady, których te kontrakty pilnują:
 * - Każda długo trwająca operacja ma ten sam trójstopniowy kształt:
 *   zlecenie zwraca identyfikator zadania, odczyt zwraca stan, kanał czasu
 *   rzeczywistego informuje o zakończeniu.
 * - Nigdy nie zwracamy sekretu z powrotem. Klucz API wraca w odpowiedzi
 *   dokładnie raz, przy zapisie, i potem już nigdy.
 * - Błąd ma zawsze ten sam kształt, żeby interfejs nie musiał zgadywać.
 */

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "unavailable"
  | "internal";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** Ścieżka pola, jeśli błąd dotyczy konkretnego wejścia, np. "email". */
  field?: string;
}

/** Kursor, nie numer strony. Feed, który rośnie od góry, nie da się
 * stronicować numerami bez powtórzeń i ubytków przy nowych wpisach. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Stany wspólne dla każdej długiej operacji: transkodowania wideo,
 * generacji muzyki, transkrypcji, pracy agenta kodującego.
 */
export type JobStatus =
  | { state: "queued"; position: number | null }
  | { state: "running"; progress: number; stage: string }
  | { state: "succeeded"; resultRef: string }
  | { state: "failed"; error: ApiError }
  | { state: "cancelled" };

export interface Job {
  id: string;
  kind: JobKind;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export type JobKind =
  | "video.transcode"
  | "video.thumbnail"
  | "audio.transcribe"
  | "music.generate"
  | "assistant.run"
  | "code.plan"
  | "code.apply";

export interface CreateJobResponse {
  jobId: string;
  /** Kanał, który wyśle zdarzenie `job.finished`. Interfejs nie odpytuje
   * w pętli — subskrybuje i czeka. */
  channel: string;
}

/* ─────────────────────────── Czas rzeczywisty ────────────────────── */

export type RealtimeEvent =
  | { type: "job.progress"; jobId: string; progress: number; stage: string }
  | { type: "job.finished"; jobId: string; status: JobStatus }
  | { type: "chat.message"; conversationId: string; messageId: string }
  | { type: "chat.presence"; conversationId: string; userIds: string[] }
  | { type: "feed.published"; postId: string; authorId: string }
  | { type: "notification"; id: string; title: string; body: string };

/* ────────────────────────────── Wersja ───────────────────────────── */

/** Prefiksy API. Każda domena ma własny; `/ws` jest jeden dla całej aplikacji. */
export const API = {
  auth: "/v1/auth",
  users: "/v1/users",
  feed: "/v1/feed",
  music: "/v1/music",
  chat: "/v1/chat",
  ai: "/v1/ai",
  git: "/v1/git",
  access: "/v1/access",
  settings: "/v1/settings",
  jobs: "/v1/jobs",
  realtime: "/ws",
} as const;

export type ApiPrefix = (typeof API)[keyof typeof API];
