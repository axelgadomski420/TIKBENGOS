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

export interface CodeOperation {
  id: string;
  planId: string | null;
  actorId: string;
  /** Każde działanie na kodzie jest zapisane i nie da się go usunąć. */
  operation: "read" | "branch.create" | "commit.create" | "pull-request.open" | "plan.reject";
  repositoryId: string;
  detail: string;
  createdAt: string;
}

export interface ConnectRepositoryResponse {
  repository: ConnectedRepository;
  /** Instalacja aplikacji GitHub. Oddzielone od samego połączenia, bo
   * instalacja dzieje się w przeglądarce użytkownika i może nie wrócić. */
  installationUrl: string;
}
