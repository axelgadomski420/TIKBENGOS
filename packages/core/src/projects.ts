/**
 * Projekty i GitHub — BENGOS Dev.
 *
 * Zasada z audytu, przeniesiona do kontraktu: agent kodujący nigdy nie
 * zapisuje niczego bez zatwierdzenia przez człowieka. Każdy plan jest
 * osobnym bytem, który trzeba przyjąć albo odrzucić, a każde działanie
 * na kodzie zostawia wpis w dzienniku.
 */

export interface ConnectedRepository {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
  isPrivate: boolean;
  /** Zakres uprawnień tokenu GitHub. Zasada najmniejszych uprawnień: czytanie
   * zawsze, zapis tylko po świadomym włączeniu. Wyświetlamy to wprost. */
  permissions: RepositoryPermissions;
  connectedAt: string;
}

export interface RepositoryPermissions {
  readContents: true;
  writeContents: boolean;
  openPullRequests: boolean;
  readIssues: boolean;
  writeIssues: boolean;
}

export interface RepositoryIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  authorLogin: string;
  labels: string[];
  createdAt: string;
}

/** Komentarz pod issue — realny zapis w GitHubie, z adresem do otwarcia. */
export interface IssueComment {
  id: string;
  htmlUrl: string;
  createdAt: string;
}

/**
 * Commit z repozytorium — podgląd, nie audyt. Audytem jest CodeOperation.
 */
export interface RepositoryCommit {
  sha: string;
  message: string;
  authorName: string;
  createdAt: string;
  url: string;
}

/**
 * Plan zmian to propozycja, nie zamiar. Istnieje po to, żeby użytkownik
 * zobaczył, co agent zamierza zrobić, zanim cokolwiek się stanie.
 */
export interface ChangePlan {
  id: string;
  repositoryId: string;
  /** Opis funkcji od użytkownika, dosłownie — to jest źródło planu. */
  request: string;
  summary: string;
  steps: PlanStep[];
  /** Pliki, które plan dotknie. Puste = plan jeszcze się tworzy. */
  filesTouched: string[];
  state: PlanState;
  createdAt: string;
}

export interface PlanStep {
  id: string;
  description: string;
  status: "pending" | "running" | "done" | "skipped";
  /** Wyjście narzędzia, jeśli krok je zwrócił. */
  output: string | null;
}

export type PlanState =
  | { state: "drafting" }
  | { state: "awaiting-approval" }
  | { state: "approved"; jobId: string }
  | { state: "rejected"; reason: string | null }
  | { state: "applied"; pullRequestUrl: string }
  | { state: "failed"; message: string };

export interface ApprovePlanRequest {
  planId: string;
  /** Zatwierdzenie jest świadome: użytkownik widzi, że powstanie gałąź, commit
   * i pull request. Bez tego pola serwer odmawia. */
  confirm: "create-branch-and-pull-request";
}

/**
 * Unia operacji dziennika. Wartości issue.* i repository.* dołączyły
 * z Etapu 5 — moduł Dev wykonuje je dziś naprawdę (token serwera), a wartości
 * branch.create, commit.create i pull-request.open pozostają zarezerwowane
 * dla executora zmian, żeby dziennik rozróżniał "człowiek kliknął" od
 * "agent napisał".
 */
export interface CodeOperation {
  id: string;
  planId: string | null;
  actorId: string;
  /** Każde działanie na kodzie jest zapisane i nie da się go usunąć. */
  operation:
    | "read"
    | "repository.connect"
    | "repository.disconnect"
    | "issue.create"
    | "issue.comment"
    | "issue.state"
    | "plan.create"
    | "plan.approve"
    | "plan.reject"
    | "branch.create"
    | "commit.create"
    | "pull-request.open";
  repositoryId: string | null;
  detail: string;
  createdAt: string;
}

export interface ConnectRepositoryResponse {
  repository: ConnectedRepository;
  /** Instalacja aplikacji GitHub. Oddzielone od samego połączenia, bo
   * instalacja dzieje się w przeglądarce użytkownika i może nie wrócić.
   * Dla tokenu serwera (Etap 5) jest to adres repozytorium — pole trzyma
   * kształt, żeby interfejs nie zmienił się po wprowadzeniu aplikacji. */
  installationUrl: string;
}
