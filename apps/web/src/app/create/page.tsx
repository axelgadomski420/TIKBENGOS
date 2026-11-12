import type { Metadata } from "next";

import { AssistantClient } from "@/components/create/assistant-client";

export const metadata: Metadata = { title: "Asystent" };

export default function CreatePage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold">Asystent</h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Pyta Twój model. Klucz ustawiasz w ustawieniach. Bez klucza odpowiada Phi-4 na Twoim serwerze.
        </p>
      </header>
      <AssistantClient />
    </div>
  );
}
