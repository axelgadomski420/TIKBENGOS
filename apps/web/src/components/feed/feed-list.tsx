"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError, Post } from "@bengos/core";

import { Announcement } from "@/components/announcement";
import { PostComments } from "@/components/feed/post-comments";
import { ApiRequestError, apiFetch } from "@/lib/api-client";
import { useCursorList } from "@/lib/use-cursor-list";
import { useSession } from "@/lib/session-context";

/**
 * Lista wpisów feedu.
 *
 * Nazwy pól pochodzą DOKŁADNIE z kontraktu `Post` w `packages/core/src/feed.ts`:
 * treść to `body` (nie `text`), a liczniki siedzą w zagnieżdżonym `counters`
 * (`counters.likes`, `counters.comments`, `counters.reposts`).
 *
 * ── AUTORZY JADĄ OSOBNO, PO TO ŻEBY BYŁO WIDAĆ KTO ─────────────────────
 * Wpisy niosą tylko `authorId`. Bez mapy autorów interfejs pokazywał surowy
 * identyfikator UUID — a to jest techniczny szczegół, nie nazwa człowieka.
 * Serwer dosyła autorów tej strony w polu `authors`, więc nie ma ani jednego
 * dodatkowego żądania na wpis.
 *
 * ── OBSERWUJ I PODNIEŚ — DWA ZAKOŃCZENIA ETAPU 2 ────────────────────────
 * Serwer dosyła w stronie pole `following`: identyfikatory autorów, których
 * czytelnik już obserwuje. Stan znany serwerowi jest prawdą wyjściową,
 * lokalna akcja go nadpisuje — optymistycznie, z powrotem przy błędzie.
 * Podniesienie działa na wzorcu polubienia: przycisk reaguje natychmiast,
 * a serwer trzyma stan idempotentnie.
 *
 * ── KOMENTARZE SĄ POD WPISEM, NIE W LICZNIKU ────────────────────────────
 * `PostComments` stoi pod akapitem z polubieniami, a nie obok liczby
 * komentarzy. Powód jest praktyczny: komentarze mają własny przycisk
 * rozwijający i własny formularz, więc wciśnięte w zdanie dałyby akcję
 * w środku tekstu. Licznik komentarzy niesie teraz przycisk — jeden
 * element, jedno znaczenie.
 */
const REASONS = ["obserwujesz", "podobny temat", "nowy dla Ciebie"] as const;
const FILTERS = ["wszystko", "obserwowani", "odkrywaj"] as const;

/** Limity z serwera (`feed/models.py` i `feed/api.py`). Trzymane raz. */
const BODY_MAX = 2000;
const TAGS_MAX = 5;

type Filter = (typeof FILTERS)[number];

/** Ludzka nazwa autora: nazwa wyświetlana, a gdy jej nie ma — uchwyt. */
function authorLabel(authors: Record<string, Author>, authorId: string): string {
  const author = authors[authorId];
  if (!author) return authorId;
  return author.displayName ?? "@" + author.username;
}

interface Author {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface PostPage {
  items: Post[];
  nextCursor: string | null;
  authors: Record<string, Author>;
}

function pathFor(filter: Filter): string {
  if (filter === "wszystko") return "/api/feed/posts";
  if (filter === "obserwowani") return "/api/feed/posts?filter=following";
  return "/api/feed/posts?filter=explore";
}

export function FeedList() {
  const { identity, isAuthenticated } = useSession();
  const [filter, setFilter] = useState<Filter>("wszystko");
  const [announcement, setAnnouncement] = useState("");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [reposted, setReposted] = useState<Record<string, boolean>>({});
  const [followOverrides, setFollowOverrides] = useState<Record<string, boolean>>({});

  const list = useCursorList<Post>(pathFor(filter), true);

  /** Stan obserwacji: serwer mówi prawdę wyjściową, lokalna akcja nadpisuje. */
  function isFollowed(authorId: string): boolean {
    const override = followOverrides[authorId];
    if (override !== undefined) return override;
    return list.following.includes(authorId);
  }

  const toggleFollow = useCallback(
    async (authorId: string, next: boolean) => {
      setFollowOverrides((prev) => ({ ...prev, [authorId]: next }));
      try {
        await apiFetch<void>("/api/feed/users/" + authorId + "/follow", {
          method: next ? "POST" : "DELETE",
        });
        setAnnouncement(next ? "Obserwujesz tego autora." : "Cofnięto obserwację.");
      } catch (cause) {
        // Cichy powrót do poprzedniego stanu: optymistyczna zmiana, która się
        // nie udała, musi zniknąć — inaczej przycisk kłamie.
        setFollowOverrides((prev) => ({ ...prev, [authorId]: !next }));
        const error: ApiError =
          cause instanceof ApiRequestError
            ? cause.error
            : { code: "internal", message: "Nie udało się zapisać obserwacji." };
        setAnnouncement(error.message);
      }
    },
    [],
  );

  const toggleRepost = useCallback(
    async (post: Post) => {
      const next = !reposted[post.id];
      setReposted((prev) => ({ ...prev, [post.id]: next }));
      try {
        await apiFetch<void>("/api/feed/posts/" + post.id + "/repost", {
          method: next ? "POST" : "DELETE",
        });
        setAnnouncement(next ? "Wpis podniesiony na Twój feed." : "Cofnięto podniesienie.");
      } catch (cause) {
        setReposted((prev) => ({ ...prev, [post.id]: !next }));
        const error: ApiError =
          cause instanceof ApiRequestError
            ? cause.error
            : { code: "internal", message: "Nie udało się podnieść wpisu." };
        setAnnouncement(error.message);
      }
    },
    [reposted],
  );

  const toggleLike = useCallback(
    async (post: Post) => {
      const next = !liked[post.id];
      setLiked((prev) => ({ ...prev, [post.id]: next }));
      try {
        await apiFetch<void>("/api/feed/posts/" + post.id + "/like", {
          method: next ? "POST" : "DELETE",
        });
        setAnnouncement(next ? "Polubiono wpis." : "Cofnięto polubienie.");
      } catch (cause) {
        // Cichy powrót do poprzedniego stanu: optymistyczna zmiana, która się
        // nie udała, musi zniknąć — inaczej licznik kłamie.
        setLiked((prev) => ({ ...prev, [post.id]: !next }));
        const error: ApiError =
          cause instanceof ApiRequestError
            ? cause.error
            : { code: "internal", message: "Nie udało się zapisać polubienia." };
        setAnnouncement(error.message);
      }
    },
    [liked],
  );

  // Reakcja na zmianę filtra jest akcją użytkownika, więc jest ogłaszana.
  useEffect(() => {
    setAnnouncement("Filtr: " + filter + ".");
  }, [filter]);

  return (
    <section aria-labelledby="feed-posts" className="space-y-6">
      <Announcement message={announcement} />

      <div>
        <h2 id="feed-posts" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Wpisy
        </h2>
        <div role="group" aria-label="Filtr wpisów" className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              className={"min-h-[var(--bengos-touch-target-min)] rounded-full border px-4 text-[var(--bengos-size-caption)] transition-colors duration-[var(--bengos-motion-fast)] " +
                (filter === item
                  ? "border-[var(--bengos-accent)] text-[var(--bengos-accent)]"
                  : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]")}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Rekomendacje oparte na zainteresowaniach dołączą po Etapie 2. Powody, które będą
          widoczne przy wpisie: {REASONS.join(" · ")}.
        </p>
      </div>

      {isAuthenticated ? <Composer onPublished={list.reload} /> : null}

      {list.loading ? (
        <p role="status" className="text-[var(--bengos-text-muted)]">
          Wczytuję wpisy…
        </p>
      ) : list.error ? (
        <div
          role="alert"
          className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-4 py-3"
        >
          <p>{list.error.message}</p>
          <button
            type="button"
            onClick={list.reload}
            className="mt-2 min-h-[var(--bengos-touch-target-min)] rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)]"
          >
            Spróbuj ponownie
          </button>
        </div>
      ) : list.items.length === 0 ? (
        <div className="bengos-surface-card">
          <h3 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
            Feed jest jeszcze pusty
          </h3>
          <p className="mt-2 text-[var(--bengos-text-muted)]">
            {isAuthenticated
              ? "Nikt jeszcze nic nie napisał. Twój wpis będzie pierwszy — i pojawi się tu od razu."
              : "Nie ma tu jeszcze żadnych wpisów. Możesz założyć konto i napisać pierwszy."}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {list.items.map((post) => (
              <li key={post.id} className="bengos-surface-card">
                <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                  {authorLabel(list.authors, post.authorId)}
                  {post.createdAt ? " · " + post.createdAt : ""}
                </p>
                {post.repostedBy ? (
                  <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]">
                    Podniesione przez {authorLabel(list.authors, post.repostedBy)}
                  </p>
                ) : null}
                {post.body ? <p className="mt-2 whitespace-pre-line">{post.body}</p> : null}
                {post.media?.thumbnailUrl?.startsWith("data:image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.media.thumbnailUrl} alt={post.audioDescription?.text || ""} className="mt-3 max-h-80 w-full rounded-md object-contain" />
                ) : null}
                {post.tags.length > 0 ? (
                  <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]">
                    {post.tags.map((tag) => "#" + tag).join(" ")}
                  </p>
                ) : null}
                <p className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                  Polubienia: {post.counters.likes} · Podniesienia: {post.counters.reposts}
                </p>
                {isAuthenticated ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={Boolean(liked[post.id])}
                      onClick={() => void toggleLike(post)}
                      className={"bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border px-4 text-[var(--bengos-size-caption)] " +
                        (liked[post.id]
                          ? "border-[var(--bengos-accent)] text-[var(--bengos-accent)]"
                          : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]")}
                    >
                      {liked[post.id] ? "Polubione" : "Polub"}
                    </button>
                    <button
                      type="button"
                      aria-pressed={Boolean(reposted[post.id])}
                      onClick={() => void toggleRepost(post)}
                      className={"bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border px-4 text-[var(--bengos-size-caption)] " +
                        (reposted[post.id]
                          ? "border-[var(--bengos-accent)] text-[var(--bengos-accent)]"
                          : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]")}
                    >
                      {reposted[post.id] ? "Podniesione" : "Podnieś"}
                    </button>
                    {identity && post.authorId !== identity.id ? (
                      <button
                        type="button"
                        aria-pressed={isFollowed(post.authorId)}
                        onClick={() => void toggleFollow(post.authorId, !isFollowed(post.authorId))}
                        className={"bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border px-4 text-[var(--bengos-size-caption)] " +
                          (isFollowed(post.authorId)
                            ? "border-[var(--bengos-accent)] text-[var(--bengos-accent)]"
                            : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]")}
                      >
                        {isFollowed(post.authorId) ? "Obserwowany" : "Obserwuj"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {/*
                  Komentarze stoją tu, a nie w akapicie z licznikiem:
                  mają własny przycisk rozwijający i własny formularz, więc
                  wciśnięcie ich w zdanie dałoby akcję w środku tekstu.
                */}
                <PostComments postId={post.id} count={post.counters.comments} />
              </li>
            ))}
          </ul>

          {list.nextCursor ? (
            <button
              type="button"
              onClick={list.loadMore}
              disabled={list.loadingMore}
              className="bengos-touch-target w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4"
            >
              {list.loadingMore ? "Wczytuję…" : "Wczytaj więcej"}
            </button>
          ) : (
            <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              To wszystko, co jest w feedzie.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Pole do napisania wpisu.
 *
 * Licznik znaków jest tu, a nie tylko w komunikacie błędu, bo limit 80 jest
 * krótki: użytkownik pisze i widzi, ile mu zostało, zamiast dowiadywać się
 * po fakcie, że o trzy znaki za dużo. Nadmiar nadal jest odrzucany także
 * po stronie serwera — interfejs nie jest strażnikiem, jest podpowiedzią.
 *
 * Tagi przyjmujemy w jednym polu, oddzielone spacją, a nie jako osobne
 * wejścia: pięć osobnych pól dla czegoś, co wpisuje się jednym ciągiem,
 * to więcej formularza niż potrzeba.
 */
function Composer({ onPublished }: { onPublished: () => void }) {
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = BODY_MAX - body.length;
  const tooLong = remaining < 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || tooLong) return;

    const trimmed = body.trim();
    if (!trimmed) {
      setError("Wpis nie może być pusty.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiFetch<Post>("/api/feed/posts", {
        method: "POST",
        body: {
          body: trimmed,
          tags: tags
            .split(/\s+/)
            .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
            .filter(Boolean)
            .slice(0, TAGS_MAX),
        },
      });
      setBody("");
      setTags("");
      onPublished();
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.error.message
          : "Nie udało się opublikować wpisu.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bengos-surface-card">
      <label htmlFor="composer-body" className="block font-[var(--bengos-weight-medium)]">
        Nowy wpis
      </label>
      <p id="composer-hint" className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Krótki opis — do {BODY_MAX} znaków. Zdjęcie dodasz w studio.
      </p>

      <textarea
        id="composer-body"
        value={body}
        rows={2}
        aria-describedby="composer-hint"
        aria-invalid={tooLong ? true : undefined}
        onChange={(event) => setBody(event.target.value)}
        className={"mt-2 w-full rounded-[var(--bengos-radius-control)] border bg-[var(--bengos-surface-sunken)] px-3 py-2 " +
          (tooLong ? "border-[var(--bengos-danger)]" : "border-[var(--bengos-border)]")}
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label htmlFor="composer-tags" className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Tagi
        </label>
        <input
          id="composer-tags"
          type="text"
          value={tags}
          placeholder="poranek muzyka"
          onChange={(event) => setTags(event.target.value)}
          className="min-h-[var(--bengos-touch-target-min)] min-w-0 flex-1 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3"
        />
        {/*
          Licznik mówi, ile znaków zostało. `role="status"` byłby tu za
          mocny — czytnik odczytałby każdą cyfrę przy każdym naciśnięciu
          klawisza. Wartość jest widoczna, a nadmiar sygnalizuje kolor pola
          i `aria-invalid`, co czytnik ogłosi razem z fokusem na polu.
        */}
        <span className={tooLong ? "text-[var(--bengos-danger)]" : "text-[var(--bengos-text-muted)]"}>
          {remaining}
        </span>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || tooLong}
        className="bengos-touch-target mt-3 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] disabled:opacity-60"
      >
        {busy ? "Publikuję…" : "Opublikuj"}
      </button>
    </form>
  );
}
