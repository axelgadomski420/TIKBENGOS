import type { Metadata } from "next";

import { ChatClient } from "@/components/chat/chat-client";
import { RealtimeIndicator } from "@/components/realtime-indicator";

export const metadata: Metadata = {
  title: "BENGOS Chat — TIKBENGOS",
};

/**
 * Czat — Etap 4 (tekst).
 *
 * Działa TERAZ: rozmowy 1:1 (idempotentne — jedna rozmowa na parę osób),
 * grupy przez API, wiadomości tekstowe do 2000 znaków, licznik
 * nieprzeczytanych, oznaczanie przeczytane, miękkie usuwanie własnych
 * wiadomości, kontakty z obserwacji, powiadomienia w czasie rzeczywistym
 * przez osobisty kanał.
 *
 * Dojdzie w kolejnych etapach (i nie jest ukrywane w interfejsie):
 * załączniki (wymaga magazynu R2), tłumaczenia i napisy per rozmowa,
 * reakcje emoji, obecność "na żywo", głos i migi.
 */
export default function ChatPage() {
  return (
    <div className="space-y-6">
      <ChatClient />
      <RealtimeIndicator />
    </div>
  );
}
