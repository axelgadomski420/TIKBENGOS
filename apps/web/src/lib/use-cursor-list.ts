"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "@bengos/core";

import { ApiRequestError, apiFetch } from "@/lib/api-client";

/**
 * Zasób stronicowany kursorem: pobierz, wczytaj więcej, ponów.
 *
 * Osobny plik, a nie rozszerzenie `useAsync`, bo to inny problem:
 * stronicowanie dokłada strony do już pobranej listy i tylko pierwsza strona
 * może zamienić całość. Wrzucenie tego do `useAsync` wymagałoby flagi, która
 * zmienia jego znaczenie — a flaga zmieniająca znaczenie hooka to błąd
 * w zalążku.
 *
 * Rozmiar strony jest zdefiniowany TU, a nie w `@bengos/core`. Wcześniejsza
 * wersja importowała stałą `PAGE_SIZE` z kontraktu, ale kontrakt jej nie ma —
 * build produkcyjny przerywał się na błędzie typu. Rozmiar strony jest
 * decyzją interfejsu, nie kontraktu danych, i to jest właściwe miejsce.
 *
 * ── `authors` JEST TYPOWANE, NIE PRZECIąGANE PRZEZ `unknown` ────────────
 * Poprzednia wersja oddawała całą stronę w polu `page: unknown`, a ekran
 * feedu czytał z niej `authors` — i build produkcyjny przerywał się na
 * `Property 'authors' does not exist on type 'CursorList<Post>'`.
 *
 * Rzutowanie w komponencie byłoby obejściem, nie naprawą: typ `unknown`
 * zmusza każdego odbiorcę do rzutowania i gubi informację o kształcie.
 * Zamiast tego hook przyjmuje TYP STRONY jako drugi parametr generyczny,
 * a `authors` (opcjonalna mapa autorów) jest częścią kontraktu hooka.
 *
 * Pole `authors` jest OPCJONALNE i puste, gdy odpowiedź go nie niesie —
 * inne listy stronicowane w tym projekcie nie dosyłają autorów i mają
 * prawo ich nie mieć. Dzięki temu hook obsługuje oba przypadki bez
 * drugiego wariantu.
 */

const PAGE_SIZE = 20;

/** Autor w postaci, w jakiej dosyła go feed. */
export interface PageAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Kształt strony z serwera. Pola poza `items` są OPCJONALNE, bo nie każdy
 * endpoint stronicowany je dosyła — feed dosyła autorów, inne listy nie.
 */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  authors?: Record<string, PageAuthor>;
}

export interface CursorList<T> {
  items: T[];
  /**
   * Mapa autorów z OSTATNIEJ pobranej strony. Pusta, gdy endpoint jej nie
   * dosyła — konsument nie musi sprawdzać, czy pole istnieje.
   */
  authors: Record<string, PageAuthor>;
  loading: boolean;
  loadingMore: boolean;
  error: ApiError | null;
  nextCursor: string | null;
  reload: () => void;
  loadMore: () => void;
}

export function useCursorList<T>(path: string, enabled = true): CursorList<T> {
  const [items, setItems] = useState<T[]>([]);
  const [authors, setAuthors] = useState<Record<string, PageAuthor>>({});
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const separator = path.includes("?") ? "&" : "?";
      const query = cursor
        ? `${separator}limit=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`
        : `${separator}limit=${PAGE_SIZE}`;
      return apiFetch<CursorPage<T>>(`${path}${query}`);
    },
    [path],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPage(null)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setNextCursor(result.nextCursor);
        setAuthors(result.authors ?? {});
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof ApiRequestError
            ? cause.error
            : { code: "internal", message: "Nie udało się wczytać listy." },
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, fetchPage, nonce]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore || loading) return;
    setLoadingMore(true);
    fetchPage(nextCursor)
      .then((result) => {
        setItems((prev) => [...prev, ...result.items]);
        setNextCursor(result.nextCursor);
        // Autorzy SCALAJĄ SIĘ, nie zastępują. Ta sama osoba występuje
        // w kilku wpisach i na kilku stronach, a podmiana mapy na mapę
        // z ostatniej strony wyrzuciłaby autorów z wcześniejszych wpisów.
        setAuthors((prev) => ({ ...prev, ...(result.authors ?? {}) }));
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof ApiRequestError
            ? cause.error
            : { code: "internal", message: "Nie udało się wczytać kolejnej strony." },
        );
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }, [fetchPage, loading, loadingMore, nextCursor]);

  return {
    items,
    authors,
    loading,
    loadingMore,
    error,
    nextCursor,
    reload: () => setNonce((n) => n + 1),
    loadMore,
  };
}
