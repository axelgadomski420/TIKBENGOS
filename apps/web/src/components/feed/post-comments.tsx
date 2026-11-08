"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError, Comment } from "@bengos/core";

import { Announcement } from "@/components/announcement";
import { ApiRequestError, apiFetch } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

// Komentarze pod wpisem.
//
// DWIE RZECZY, KTORE TEN KOMPONENT MUSI ODROZNIAĆ
// parentCommentId === null to komentarz główny, a niepusty — odpowiedź.
// Wyświetlamy je na dwa poziomy i ani jednego więcej: dokładnie tak, jak
// mówi model (feed/models.py) i kontrakt (packages/core/src/feed.ts).
// Serwer odrzuca odpowiedź na odpowiedź kodem 400, więc interfejs NIE
// pokazuje tam przycisku „Odpowiedz” — pokazywanie akcji, która zawsze
// zawiedzie, jest gorsze niż jej brak.
//
// LIMIT JEST POKAZYWANY PRZED WYSŁANIEM
// 500 znaków to COMMENT_MAX_LENGTH z modelu. Licznik mówi, ile zostało,
// a nadmiar blokuje przycisk — użytkownik nie dowiaduje się o limicie
// z błędu odrzucenia. Nadmiar odrzuca też serwer; interfejs jest
// podpowiedzią, nie strażnikiem.
//
// OGŁASZANIE ZMIANY STANU
// Dodanie komentarza po akcji użytkownika jest ogłaszane przez
// Announcement (role="status", aria-live="polite"). Bez tego osoba
// korzystająca z czytnika ekranu widzi, że formularz się wyczyścił,
// i nie wie, czy komentarz został dodany.

/** Limit treści z feed/models.py (COMMENT_MAX_LENGTH). */
const COMMENT_MAX = 500;

interface CommentPage {
  items: Comment[];
}

/**
 * Komentarze wpisu.
 *
 * Wczytywane PO rozwinieciu, nie razem z wpisem: feed pokazuje dwadzieścia
 * wpisów, a wczytywanie komentarzy do wszystkich oznaczałoby dwadzieścia
 * dodatkowych żądań dla treści, której nikt nie otworzył.
 */
export function PostComments({ postId, count }: { postId: string; count: number }) {
  const { isAuthenticated } = useSession();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await apiFetch<CommentPage | Comment[]>(
        `/api/feed/posts/${postId}/comments`,
      );
      // Serwer zwraca listę wprost, ale czytamy oba kształty: brak koperty
      // {items} jest tu możliwy przy zmianie serializacji, a wtedy lepiej
      // pokazać pustą listę niż wywalić ekran.
      setComments(Array.isArray(page) ? page : (page.items ?? []));
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.error
          : { code: "internal", message: "Nie udało się wczytać komentarzy." },
      );
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const roots = comments.filter((comment) => comment.parentCommentId === null);
  const repliesOf = (id: string) =>
    comments.filter((comment) => comment.parentCommentId === id);

  return (
    <div className="mt-3">
      <Announcement message={announcement} />

      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((prev) => !prev);
          setAnnouncement(open ? "Komentarze zwinięte." : "Komentarze rozwinięte.");
        }}
        className="bengos-touch-target rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)] transition-colors duration-[var(--bengos-motion-fast)] hover:border-[var(--bengos-border-strong)]"
      >
        {open ? "Komentarze" : `Komentarze (${count})`}
      </button>

      {open ? (
        <div className="mt-3">
          {loading ? (
            <p role="status" className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              Wczytuję komentarze…
            </p>
          ) : error ? (
            <div
              role="alert"
              className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-3 py-2"
            >
              <p className="text-[var(--bengos-size-caption)]">{error.message}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="bengos-touch-target mt-2 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)]"
              >
                Spróbuj ponownie
              </button>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              {isAuthenticated
                ? "Nie ma tu jeszcze komentarzy. Twój będzie pierwszy."
                : "Nie ma tu jeszcze komentarzy. Możesz założyć konto i napisać pierwszy."}
            </p>
          ) : (
            <ul className="space-y-3">
              {roots.map((comment) => (
                <li key={comment.id}>
                  <CommentBody comment={comment} />
                  <ul className="mt-2 space-y-2 border-l border-[var(--bengos-border)] pl-4">
                    {repliesOf(comment.id).map((reply) => (
                      <li key={reply.id}>
                        <CommentBody comment={reply} />
                      </li>
                    ))}
                  </ul>
                  {isAuthenticated && repliesOf(comment.id).length === 0 ? (
                    <ReplyForm
                      postId={postId}
                      parentCommentId={comment.id}
                      onAdded={() => {
                        setAnnouncement("Odpowiedź dodana.");
                        void load();
                      }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {isAuthenticated ? (
            <CommentForm
              postId={postId}
              onAdded={() => {
                setAnnouncement("Komentarz dodany.");
                void load();
              }}
            />
          ) : (
            <p className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              Komentarze są przypisane do konta, więc dodawanie pojawi się po zalogowaniu.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Jedna wypowiedź. Uchwyt zamiast surowego identyfikatora — tak jak w feedzie. */
function CommentBody({ comment }: { comment: Comment }) {
  return (
    <>
      <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        {comment.authorId}
      </p>
      <p className="whitespace-pre-line">{comment.body}</p>
    </>
  );
}

/** Pole komentarza głównego. */
function CommentForm({ postId, onAdded }: { postId: string; onAdded: () => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = COMMENT_MAX - body.length;
  const tooLong = remaining < 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (busy || tooLong) return;
    if (!trimmed) {
      setError("Komentarz nie może być pusty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch<Comment>(`/api/feed/posts/${postId}/comments`, {
        method: "POST",
        body: { body: trimmed },
      });
      setBody("");
      onAdded();
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.error.message
          : "Nie udało się dodać komentarza.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label htmlFor={`comment-${postId}`} className="block text-[var(--bengos-size-caption)] font-[var(--bengos-weight-medium)]">
        Dodaj komentarz
      </label>
      <p
        id={`comment-hint-${postId}`}
        className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]"
      >
        Do {COMMENT_MAX} znaków. Odpowiedzi na komentarze są dozwolone, ale głębszego
        zagnieżdżenia nie ma.
      </p>
      <textarea
        id={`comment-${postId}`}
        value={body}
        rows={2}
        aria-describedby={`comment-hint-${postId}`}
        aria-invalid={tooLong ? true : undefined}
        onChange={(event) => {
          setBody(event.target.value);
          setError(null);
        }}
        className={
          "mt-2 w-full rounded-[var(--bengos-radius-control)] border bg-[var(--bengos-surface-sunken)] px-3 py-2 " +
          (tooLong ? "border-[var(--bengos-danger)]" : "border-[var(--bengos-border)]")
        }
      />
      <div className="mt-1 flex items-center gap-3">
        <span
          className={
            tooLong
              ? "text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]"
              : "text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]"
          }
        >
          {remaining}
        </span>
        <button
          type="submit"
          disabled={busy || tooLong}
          className="bengos-touch-target ml-auto rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 text-[var(--bengos-size-caption)] font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] disabled:opacity-60"
        >
          {busy ? "Dodaję…" : "Dodaj"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** Pole odpowiedzi na komentarz główny. Zawsze jeden poziom w głąb. */
function ReplyForm({
  postId,
  parentCommentId,
  onAdded,
}: {
  postId: string;
  parentCommentId: string;
  onAdded: () => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const remaining = COMMENT_MAX - body.length;
  const tooLong = remaining < 0;
  const fieldId = `reply-${parentCommentId}`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (busy || tooLong || !trimmed) return;
    setBusy(true);
    try {
      await apiFetch<Comment>(`/api/feed/posts/${postId}/comments`, {
        method: "POST",
        body: { body: trimmed, parentCommentId },
      });
      setBody("");
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2">
      <label htmlFor={fieldId} className="bengos-visually-hidden">
        Odpowiedz na komentarz
      </label>
      <input
        id={fieldId}
        type="text"
        value={body}
        placeholder="Odpowiedz…"
        aria-invalid={tooLong ? true : undefined}
        onChange={(event) => setBody(event.target.value)}
        className="min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3 text-[var(--bengos-size-caption)]"
      />
    </form>
  );
}
