import type { Metadata } from "next";

import { ChatClient } from "@/components/chat/chat-client";
import { RealtimeIndicator } from "@/components/realtime-indicator";

export const metadata: Metadata = {
  title: "BengMess",
};

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="rounded-[var(--bengos-radius-card)] border border-[#14515c] bg-[#071018] px-4 py-4">
        <p className="text-xs uppercase tracking-[0.32em] text-[#7ef6ff]">BengMess</p>
        <h1 className="mt-1 text-3xl font-semibold">Rozmowy pod pieczęcią</h1>
        <p className="mt-2 max-w-2xl text-[var(--bengos-text-muted)]">
          Tekst, głos, obraz, plik, Morse, gloss migowy i tłumaczenie wychodzą jedną kopertą.
          Klucz zostaje na urządzeniu. Serwer nie czyta treści. Wiadomość może zniknąć po odczycie.
        </p>
      </header>
      <ChatClient />
      <RealtimeIndicator />
    </div>
  );
}
