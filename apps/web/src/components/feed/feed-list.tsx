"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { ApiError, Post } from "@bengos/core";

import { Announcement } from "@/components/announcement";
import { ApiRequestError, apiFetch } from "@/lib/api-client";
import { useCursorList } from "@/lib/use-cursor-list";
import { useSession } from "@/lib/session-context";

/**
 * Lista wpisów feedu.
 *
 * Trzy rzeczy, które ten komponent robi celowo:
 *
 * 1. Wczytuje po stronie klienta, bo lista zależy od sesji — bez tego pierwszy
 *    render serwerowy pokazywałby stan gościa, a potem przeskakiwał do stanu
 *    zalogowanego użytkownika.
 * 2. NIE pokazuje niczego, gdy serwer nie ma jeszcze feedu. Puste pole zamiast
 *    zmyślonych treści. Wpis pojawia się tylko wtedy, gdy naprawdę przyjechał
 *    z serwera — nie ma tu żadnej listy zastępczej z przykładami.
 * 3. Filtry powodu są opisem zamiarów, nie przyciskami. Rekomendacji jeszcze
 *    nie ma, więc przycisk zmieniający wyłącznie własną etykietę byłby atrapą.
 */
const REASONS = ["obserwujesz", "podobny temat", "nowy dla Ciebie"] as const;
const FILTERS = ["wszystko", "obserwowani", "odkrywaj"] as const;

type Filter = (typeof FILTERS)[number];

export function FeedList() {
  const { isAuthenticated } = useSession();
  const [filter, setFilter] = useState<Filter>("wszystko");
  const [announcement, setAnnouncement] = useState("");
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const path = filter === "wszystko" ? "/api/feed/posts" : `/api/feed/posts?filter=${filter}`;
  const list = useCursorList<Post>(path, true);

  const toggleLike = useCallback(async (post: Post) => {
    const next = !liked[post.id];
    setLiked((prev) => ({ ...prev, [post.id]: next }));
    try {
      await apiFetch<void>(`/api/feed/posts/${post.id}/like`, {
        method: next ? "POST" : "DELETE",
      });
      setAnnouncement(next ? "Polubiono wpis." : "Cofnięto polubienie.");
    } catch (cause) {
      setLiked((prev) => ({ ...prev, [post.id]: !next }));
      const error: ApiError =
        cause instanceof ApiRequestError
          ? cause.error
          : { code: "internal", message: "Nie udało się zapisać polubienia." };
      setAnnouncement(error.message);
    }
  }, [liked]);

  // Reakcja na zmianę filtra jest akcją użytkownika, więc jest ogłaszana.
  useEffect(() => {
    setAnnouncement(`Filtr: ${filter}.`);
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
              className={`min-h-[var(--bengos-touch-target-min)] rounded-full border px-4 text-[var(--bengos-size-caption)] transition-colors duration-[var(--bengos-motion-fast)] ${
                filter === item
                  ? "border-[var(--bengos-accent)] text-[var(--bengos-accent)]"
                  : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]"
              }`}
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
            Nie ma tu żadnych wpisów, bo serwer nie ma jeszcze funkcji publikowania —
            to Etap 2. Nie pokazujemy przykładowych treści, żeby pusty feed nie wyglądał
            na działający.
          </p>
          <p className="mt-3">
            <Link
              href="/studio"
              className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] px-2 text-[var(--bengos-accent)]"
            >
              Co będzie można opublikować
            </Link>
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {list.items.map((post) => (
              <li key={post.id} className="bengos-surface-card">
                <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                  {post.authorId}
                  {post.createdAt ? ` · ${post.createdAt}` : ""}
                </p>
                <p className="mt-2 whitespace-pre-line">{post.text}</p>
                <p className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                  Polubienia: {post.likeCount} · Komentarze: {post.commentCount}
                </p>
                {isAuthenticated ? (
                  <button
                    type="button"
                    aria-pressed={Boolean(liked[post.id])}
                    onClick={() => void toggleLike(post)}
                    className={`bengos-touch-target mt-3 inline-flex rounded-[var(--bengos-radius-control)] border px-4 text-[var(--bengos-size-caption)] ${
                      liked[post.id]
                        ? "border-[var(--bengos-accent)] text-[var(--bengos-accent)]"
                        : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]"
                    }`}
                  >
                    {liked[post.id] ? "Polubione" : "Polub"}
                  </button>
                ) : null}
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
