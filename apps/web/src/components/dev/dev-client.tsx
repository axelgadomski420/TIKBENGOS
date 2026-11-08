"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError, ChangePlan, ConnectedRepository, RepositoryIssue } from "@bengos/core";

import { Announcement } from "@/components/announcement";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

/**
 * Panel BENGOS Dev.
 *
 * Kontrakt to packages/core/src/projects.ts: ConnectedRepository z
 * uprawnieniami wykrytymi z GitHuba (pokazujemy je przy każdym
 * repozytorium — użytkownik widzi, co token naprawdę może), RepositoryIssue
 * czytane ŻYWO z GitHuba, ChangePlan z pełnym stanem zgody.
 *
 * Zasada z audytu, wbudowana w interfejs: NIC nie jest wykonywane przez
 * agenta. Issue zakłada i komentuje człowiek; plan jest propozycją;
 * zatwierdzenie planu póki co dostaje odmowę z wyjaśnieniem, dopóki
 * executor (Aider w piaskownicy) nie jest podłączony — i to jest
 * napisane na ekranie, a nie schowane za spinnerem, który nigdy się
 * nie kończy.
 */

interface RepositoryCommitInfo {
  sha: string;
  message: string;
  authorName: string;
  createdAt: string;
  url: string;
}

interface OperationInfo {
  id: string;
  planId: string | null;
  actorId: string;
  operation: string;
  repositoryId: string | null;
  detail: string;
  createdAt: string;
}

const ISSUE_STATES = ["open", "closed", "all"] as const;
const BTN =
  "bengos-touch-target inline-flex items-center rounded-[var(--bengos-radius-control)] border px-4 text-[var(--bengos-size-caption)]";
const BTN_PRIMARY =
  "bengos-touch-target inline-flex items-center rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] disabled:opacity-60";
const INPUT =
  "min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3";

function messageOf(cause: unknown): ApiError {
  return cause instanceof ApiRequestError
    ? cause.error
    : { code: "internal", message: "Nieznany błąd." };
}

export function DevClient() {
  const { isAuthenticated } = useSession();

  const [repositories, setRepositories] = useState<ConnectedRepository[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [issues, setIssues] = useState<RepositoryIssue[]>([]);
  const [issueState, setIssueState] = useState<(typeof ISSUE_STATES)[number]>("open");
  const [commits, setCommits] = useState<RepositoryCommitInfo[]>([]);
  const [plans, setPlans] = useState<ChangePlan[]>([]);
  const [operations, setOperations] = useState<OperationInfo[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const [connectOwner, setConnectOwner] = useState("");
  const [connectName, setConnectName] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [planText, setPlanText] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = repositories.find((r) => r.id === selectedId) ?? null;

  const reloadRepositories = useCallback(async () => {
    try {
      const page = await apiFetch<{ items: ConnectedRepository[] }>("/api/git/repositories");
      setRepositories(page.items ?? []);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, []);

  const reloadPlansAndLog = useCallback(async () => {
    try {
      const [planPage, logPage] = await Promise.all([
        apiFetch<{ items: ChangePlan[] }>("/api/git/plans"),
        apiFetch<{ items: OperationInfo[] }>("/api/git/operations"),
      ]);
      setPlans(planPage.items ?? []);
      setOperations(logPage.items ?? []);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, []);

  const loadRepoData = useCallback(async (repositoryId: string, state: string) => {
    try {
      const [issuePage, commitPage] = await Promise.all([
        apiFetch<{ items: RepositoryIssue[] }>(
          "/api/git/repositories/" + repositoryId + "/issues?state=" + state
        ),
        apiFetch<{ items: RepositoryCommitInfo[] }>("/api/git/repositories/" + repositoryId + "/commits"),
      ]);
      setIssues(issuePage.items ?? []);
      setCommits(commitPage.items ?? []);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void reloadRepositories();
    void reloadPlansAndLog();
  }, [isAuthenticated, reloadRepositories, reloadPlansAndLog]);

  useEffect(() => {
    if (selectedId) {
      void loadRepoData(selectedId, issueState);
    } else {
      setIssues([]);
      setCommits([]);
    }
  }, [selectedId, issueState, loadRepoData]);

  const connect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/git/repositories", {
        method: "POST",
        body: { owner: connectOwner.trim(), name: connectName.trim() },
      });
      setConnectOwner("");
      setConnectName("");
      setAnnouncement("Repozytorium podłączone.");
      await reloadRepositories();
      await reloadPlansAndLog();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }, [busy, connectOwner, connectName, reloadRepositories, reloadPlansAndLog]);

  const disconnect = useCallback(async (id: string) => {
    try {
      await apiFetch("/api/git/repositories/" + id, { method: "DELETE" });
      setAnnouncement("Repozytorium odłączone.");
      if (selectedId === id) setSelectedId(null);
      await reloadRepositories();
      await reloadPlansAndLog();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [selectedId, reloadRepositories, reloadPlansAndLog]);

  const createIssue = useCallback(async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/git/repositories/" + selectedId + "/issues", {
        method: "POST",
        body: { title: issueTitle.trim(), body: issueBody.trim(), labels: [] },
      });
      setIssueTitle("");
      setIssueBody("");
      setAnnouncement("Issue utworzone w GitHubie.");
      await loadRepoData(selectedId, issueState);
      await reloadPlansAndLog();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }, [selectedId, busy, issueTitle, issueBody, issueState, loadRepoData, reloadPlansAndLog]);

  const commentIssue = useCallback(
    async (number: number) => {
      const body = window.prompt("Treść komentarza pod issue #" + number + ":");
      if (!body || !selectedId) return;
      try {
        await apiFetch(
          "/api/git/repositories/" + selectedId + "/issues/" + number + "/comments",
          { method: "POST", body: { body } }
        );
        setAnnouncement("Komentarz dodany.");
        await reloadPlansAndLog();
      } catch (cause) {
        setError(messageOf(cause));
      }
    },
    [selectedId, reloadPlansAndLog]
  );

  const changeIssueState = useCallback(
    async (number: number, next: "open" | "closed") => {
      if (!selectedId) return;
      try {
        await apiFetch(
          "/api/git/repositories/" + selectedId + "/issues/" + number + "/" + (next === "closed" ? "close" : "reopen"),
          { method: "POST" }
        );
        setAnnouncement(next === "closed" ? "Issue zamknięte." : "Issue otwarte ponownie.");
        await loadRepoData(selectedId, issueState);
        await reloadPlansAndLog();
      } catch (cause) {
        setError(messageOf(cause));
      }
    },
    [selectedId, issueState, loadRepoData, reloadPlansAndLog]
  );

  const createPlan = useCallback(async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/git/plans", {
        method: "POST",
        body: { repositoryId: selectedId, request: planText.trim() },
      });
      setPlanText("");
      setAnnouncement("Plan czeka na decyzję.");
      await reloadPlansAndLog();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }, [selectedId, busy, planText, reloadPlansAndLog]);

  const approvePlan = useCallback(async (plan: ChangePlan) => {
    setError(null);
    try {
      await apiFetch("/api/git/plans/" + plan.id + "/approve", {
        method: "POST",
        body: { confirm: "create-branch-and-pull-request" },
      });
      setAnnouncement("Plan zatwierdzony.");
      await reloadPlansAndLog();
    } catch (cause) {
      // Odmowa bez executora jest NORMALNA i ma być widoczna w całości —
      // to bramka zgody z kontraktu, nie błąd do ukrycia.
      setError(messageOf(cause));
    }
  }, [reloadPlansAndLog]);

  const rejectPlan = useCallback(async (plan: ChangePlan) => {
    try {
      await apiFetch("/api/git/plans/" + plan.id + "/reject", {
        method: "POST",
        body: { reason: "Odrzucono z panelu Dev." },
      });
      setAnnouncement("Plan odrzucony.");
      await reloadPlansAndLog();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [reloadPlansAndLog]);

  if (!isAuthenticated) {
    return (
      <section className="bengos-surface-card" aria-labelledby="dev-login">
        <h1 id="dev-login" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Dev jest dla zalogowanych
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Operacje na repozytoriach są przypisane do osoby — dziennik operacji
          zapisuje, KTO zakłada issue i zatwierdza plany. Bez konta nie ma
          kogo zapisać.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="dev-title" className="space-y-6">
      <header>
        <p className="bengos-eyebrow">Etap 5 — działa</p>
        <h1 id="dev-title" className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
          BENGOS Dev
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Repozytoria i issue GitHub przez token serwera (GITHUB_TOKEN). Uprawnienia
          widoczne przy każdym repozytorium są wykryte z GitHuba, nie zgadywane.
          Zatwierdzanie planów uruchomi executor (Aider w piaskownicy) dopiero po
          podłączeniu BENGOS_CODE_EXECUTOR_URL — do tego czasu dostaje odmowę
          z wyjaśnieniem, zamiast udawać wykonanie.
        </p>
      </header>

      <Announcement message={announcement} />
      {error ? (
        <div role="alert" className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-4 py-3">
          <p>{error.message}</p>
        </div>
      ) : null}

      {/* ── Repozytoria ── */}
      <div className="bengos-surface-card">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Repozytoria</h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void connect();
          }}
        >
          <label className="sr-only" htmlFor="dev-owner">Właściciel</label>
          <input id="dev-owner" className={INPUT + " max-w-[10rem]"} placeholder="właściciel" value={connectOwner} onChange={(e) => setConnectOwner(e.target.value)} />
          <span className="self-center text-[var(--bengos-text-muted)]">/</span>
          <label className="sr-only" htmlFor="dev-name">Nazwa</label>
          <input id="dev-name" className={INPUT + " max-w-[14rem]"} placeholder="nazwa" value={connectName} onChange={(e) => setConnectName(e.target.value)} />
          <button type="submit" disabled={busy || !connectOwner.trim() || !connectName.trim()} className={BTN_PRIMARY}>
            Podłącz
          </button>
        </form>

        {repositories.length === 0 ? (
          <p className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Brak podłączonych repozytoriów. Wpisz właściciela i nazwę (np. axelgadomski420 / TIKBENGOS).
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {repositories.map((repo) => (
              <li key={repo.id} className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-pressed={repo.id === selectedId}
                    onClick={() => setSelectedId(repo.id === selectedId ? null : repo.id)}
                    className={BTN + (repo.id === selectedId ? " border-[var(--bengos-accent)] text-[var(--bengos-accent)]" : " border-[var(--bengos-border)]")}
                  >
                    {repo.owner}/{repo.name}
                  </button>
                  <button type="button" className={BTN + " border-[var(--bengos-border)] text-[var(--bengos-text-muted)]"} onClick={() => void disconnect(repo.id)}>
                    Odłącz
                  </button>
                </div>
                <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                  Gałąź: {repo.defaultBranch} · {repo.isPrivate ? "prywatne" : "publiczne"} · uprawnienia:
                  zapis treści {repo.permissions.writeContents ? "TAK" : "NIE"},
                  issue {repo.permissions.writeIssues ? "zapis" : "odczyt"},
                  pull requesty {repo.permissions.openPullRequests ? "TAK" : "NIE"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Agent kodujący (self-coding) ── */}
      <div className="bengos-surface-card border-[var(--bengos-accent)]/30">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)] text-[var(--bengos-accent)]">
          Agent kodujący
        </h2>
        <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Opisz zmianę. Agent tworzy plan, czeka na Twoją zgodę, potem (gdy executor jest podłączony)
          wykonuje ją w piaskownicy: gałąź, commit, pull request. Na razie plany są zapisywane,
          zatwierdzenie zwraca uczciwą odmowę — bez udawania, że kod już się zmienił.
        </p>
        <label className="mt-4 block text-sm" htmlFor="agent-request">
          Co ma zmienić agent?
        </label>
        <textarea
          id="agent-request"
          value={planText}
          onChange={(e) => setPlanText(e.target.value)}
          placeholder="np. Dodaj endpoint marketplace do listy zakupów użytkownika"
          className={INPUT + " mt-1 min-h-[6rem] resize-y"}
          disabled={!selectedId || busy}
        />
        <button
          type="button"
          disabled={!selectedId || !planText.trim() || busy}
          onClick={() => void createPlan()}
          className={BTN_PRIMARY + " mt-3"}
        >
          {busy ? "Tworzę plan…" : "Stwórz plan zmian"}
        </button>
        {!selectedId && (
          <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Najpierw podłącz repozytorium powyżej.
          </p>
        )}
      </div>

      {/* ── Issue ── */}
      <div className="bengos-surface-card">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Issue</h2>
        {!selected ? (
          <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Wybierz repozytorium powyżej, aby zobaczyć issue i commity.
          </p>
        ) : (
          <>
            <div role="group" aria-label="Stan issue" className="mt-3 flex flex-wrap gap-2">
              {ISSUE_STATES.map((state) => (
                <button
                  key={state}
                  type="button"
                  aria-pressed={issueState === state}
                  onClick={() => setIssueState(state)}
                  className={BTN + (issueState === state ? " border-[var(--bengos-accent)] text-[var(--bengos-accent)]" : " border-[var(--bengos-border)] text-[var(--bengos-text-muted)]")}
                >
                  {state}
                </button>
              ))}
            </div>

            <ul className="mt-3 space-y-2">
              {issues.map((issue) => (
                <li key={issue.id} className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] p-3">
                  <p className="font-[var(--bengos-weight-medium)]">
                    #{issue.number} {issue.title}
                  </p>
                  <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                    {issue.state} · @{issue.authorLogin}
                    {issue.labels.length > 0 ? " · " + issue.labels.join(", ") : ""}
                  </p>
                  {issue.body ? <p className="mt-2 whitespace-pre-line">{issue.body}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={BTN + " border-[var(--bengos-border)]"} onClick={() => void commentIssue(issue.number)}>
                      Skomentuj
                    </button>
                    <button
                      type="button"
                      className={BTN + " border-[var(--bengos-border)]"}
                      onClick={() => void changeIssueState(issue.number, issue.state === "open" ? "closed" : "open")}
                    >
                      {issue.state === "open" ? "Zamknij" : "Otwórz ponownie"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {issues.length === 0 ? (
              <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                Brak issue w tym stanie.
              </p>
            ) : null}

            <form
              className="mt-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void createIssue();
              }}
            >
              <label htmlFor="issue-title" className="block text-[var(--bengos-size-caption)]">
                Nowe issue w {selected.owner}/{selected.name}
              </label>
              <input id="issue-title" className={INPUT} value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} placeholder="Tytuł" />
              <textarea id="issue-body" className={INPUT + " min-h-[80px]"} value={issueBody} onChange={(e) => setIssueBody(e.target.value)} placeholder="Opis (opcjonalnie)" />
              <button type="submit" disabled={busy || issueTitle.trim().length === 0} className={BTN_PRIMARY}>
                Utwórz issue
              </button>
            </form>
          </>
        )}
      </div>

      {/* ── Commity ── */}
      {selected ? (
        <div className="bengos-surface-card">
          <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Ostatnie commity</h2>
          <ul className="mt-3 space-y-1">
            {commits.map((commit) => (
              <li key={commit.sha} className="text-[var(--bengos-size-caption)]">
                <span className="text-[var(--bengos-accent)]">{commit.sha.slice(0, 7)}</span>{" "}
                <span className="text-[var(--bengos-text-muted)]">{commit.authorName} · </span>
                {commit.message.split("\n")[0]}
              </li>
            ))}
          </ul>
          {commits.length === 0 ? (
            <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              Brak commitów lub brak dostępu.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── Plany zmian ── */}
      <div className="bengos-surface-card">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Plany zmian</h2>
        <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Plan jest propozycją z kontraktu projects.ts: kroki rozpisze executor,
          a wykonanie wymaga świadomej zgody (gałąź, commit, pull request).
          Dopóki executor nie jest podłączony, zatwierdzenie zwraca odmowę —
          zgodę na coś, czego nie da się wykonać, traktujemy jako kłamstwo.
        </p>
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void createPlan();
          }}
        >
          <label htmlFor="plan-text" className="block text-[var(--bengos-size-caption)]">
            Opis funkcji do zaplanowania
          </label>
          <textarea id="plan-text" className={INPUT + " min-h-[80px]"} value={planText} onChange={(e) => setPlanText(e.target.value)} placeholder="Np. Dodaj eksport feedu do CSV" disabled={!selected} />
          <button type="submit" disabled={busy || !selected || planText.trim().length === 0} className={BTN_PRIMARY}>
            Utwórz plan
          </button>
        </form>

        <ul className="mt-4 space-y-2">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] p-3">
              <p className="font-[var(--bengos-weight-medium)]">{plan.request}</p>
              <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]">
                stan: {plan.state.state}
              </p>
              <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">{plan.summary}</p>
              {plan.state.state === "awaiting-approval" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={BTN_PRIMARY} onClick={() => void approvePlan(plan)}>
                    Zatwierdź (gałąź + pull request)
                  </button>
                  <button type="button" className={BTN + " border-[var(--bengos-border)]"} onClick={() => void rejectPlan(plan)}>
                    Odrzuć
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {plans.length === 0 ? (
          <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Brak planów. Wybierz repozytorium i opisz funkcję.
          </p>
        ) : null}
      </div>

      {/* ── Dziennik operacji ── */}
      <div className="bengos-surface-card">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">Dziennik operacji</h2>
        <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Trwały i nieusuwalny — to trzon zasady z audytu. Nie ma tu przycisku
          usuwania i nie będzie.
        </p>
        <ul className="mt-3 space-y-1">
          {operations.map((operation) => (
            <li key={operation.id} className="text-[var(--bengos-size-caption)]">
              <span className="text-[var(--bengos-accent)]">{operation.operation}</span>{" "}
              <span className="text-[var(--bengos-text-muted)]">{operation.detail}</span>
            </li>
          ))}
        </ul>
        {operations.length === 0 ? (
          <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Dziennik jest jeszcze pusty.
          </p>
          ) : null}
        </div>
    </section>
  );
}
