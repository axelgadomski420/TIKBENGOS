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
 * ── ZWRACAMY CAŁĄ STRONĘ, NIE TYLKO POZYCJE ─────────────────────────────
 * Feed dosyła razem z wpisami mapę autorów (`authors`). Wcześniejsza wersja
 * tego hooka wycinała z odpowiedzi tylko `items` i `nextCursor`, więc mapa
 * autorów ginęła po drodze — a bez niej lista pokazywała surowe identyfikatory
 * UUID zamiast nazw. Hook oddaje teraz surową stronę, a decyzja, co z niej
 * odczytać, należy do ekranu.
 */

const PAGE_SIZE = 20;

export interface CursorList<T> {
  items: T[];
  /**
   * Cała ostatnia strona odpowiedzi. Ekrany, które potrzebują pola spoza
   * `items` (na przykład `authors` w feedzie), czytają je stąd.
   */
  page: unknown;
  loading: boolean;
  loadingMore: boolean;
  error: ApiError | null;
  nextCursor: string | null;
  reload: () => void;
  loadMore: () => void;
}

export function useCursorList<T>(path: string, enabled = true): CursorList<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState<unknown>(null);
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
      return apiFetch<{ items: T[]; nextCursor: string | null }>(`${path}${query}`);
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
        setPage(result);
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
        setPage(result);
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
    page,
    loading,
    loadingMore,
    error,
    nextCursor,
    reload: () => setNonce((n) => n + 1),
    loadMore,
  };
}
