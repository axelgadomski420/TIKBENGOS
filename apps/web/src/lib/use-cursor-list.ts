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
 */

interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** Ile pozycji na stronę. Serwer ogranicza górną granicę osobnym limitem. */
const PAGE_SIZE = 20;

export interface CursorList<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: ApiError | null;
  nextCursor: string | null;
  reload: () => void;
  loadMore: () => void;
}

export function useCursorList<T>(path: string, enabled = true): CursorList<T> {
  const [items, setItems] = useState<T[]>([]);
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
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
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
      .then((page) => {
        setItems((prev) => [...prev, ...page.items]);
        setNextCursor(page.nextCursor);
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
    loading,
    loadingMore,
    error,
    nextCursor,
    reload: () => setNonce((n) => n + 1),
    loadMore,
  };
}
