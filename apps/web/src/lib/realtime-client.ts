"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Klient kanału czasu rzeczywistego.
 *
 * Serwerowa część już istnieje: `accounts/consumers.py` przyjmuje połączenie
 * tylko z ważną sesją (bez niej zamyka kodem 4401), odpowiada na `ping`
 * i nie ufa niczemu, co przychodzi w payloadzie. Ten plik jest drugą połową —
 * bez niego kanał był gotowy, ale nic go nie otwierało.
 *
 * Trzy rzeczy, które ten hook robi świadomie:
 *
 * 1. NIE ŁĄCZY SIĘ, GDY NIE MA SESJI. Kanał wymaga uwierzytelnienia, więc
 *    otwieranie go bez zalogowania kończyłoby się zamknięciem 4401 w pętli.
 *    Sprawdzamy więc `isAuthenticated`, zanim w ogóle próbujemy.
 * 2. ŁĄCZY SIĘ PONOWNIE Z ODSTĘPEM, nie natychmiast. Natychmiastowa próba
 *    po zerwaniu to zamiana jednego problemu na pętlę, która dobija serwer.
 * 3. SPRZĄTA PO SOBIE. Zamknięcie połączenia i wyczyszczenie timera są
 *    w tym samym miejscu, żeby nie zostało nic, co żyje po odmontowaniu.
 */

export type RealtimeStatus = "idle" | "connecting" | "open" | "closed" | "unavailable";

export interface RealtimeState {
  status: RealtimeStatus;
  /** Ostatnia wiadomość z serwera, w surowej postaci. */
  lastMessage: unknown;
  /** Wyślij wiadomość. Zwraca `false`, gdy połączenia nie ma. */
  send: (payload: unknown) => boolean;
}

const RECONNECT_DELAY_MS = 3000;

function realtimeUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (!base) return null;
  // Konfiguracja podaje bazę z `/ws` (np. `wss://domena/ws`), a konsument
  // siedzi pod `ws/chat/` — dlatego doklejamy tylko nazwę kanału.
  return `${base.replace(/\/$/, "")}/chat/`;
}

export function useRealtime(enabled: boolean): RealtimeState {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback((payload: unknown): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  useEffect(() => {
    const url = realtimeUrl();
    if (!enabled) {
      setStatus("idle");
      return;
    }
    if (!url) {
      // Brak adresu to nie błąd — to niepełna konfiguracja. Mówimy to wprost,
      // zamiast udawać, że kanał działa.
      setStatus("unavailable");
      return;
    }

    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setStatus("connecting");

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        setStatus("open");
      };

      socket.onmessage = (event) => {
        if (disposed) return;
        try {
          setLastMessage(JSON.parse(event.data as string));
        } catch {
          // Nieparsowalna wiadomość to nie powód, żeby zrywać połączenie.
          setLastMessage(event.data);
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        setStatus("closed");
        retryRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        // `onerror` zawsze poprzedza `onclose`, więc ponowienie robi `onclose`.
        setStatus("closed");
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      const socket = socketRef.current;
      if (socket) {
        // Wyczyszczenie handlerów przed zamknięciem: bez tego `onclose`
        // zaplanowałby ponowienie dla połączenia, które właśnie kończymy.
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
      socketRef.current = null;
    };
  }, [enabled]);

  return { status, lastMessage, send };
}
