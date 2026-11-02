import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { RealtimeIndicator } from "@/components/realtime-indicator";

export const metadata: Metadata = { title: "BENGOS Chat" };

/**
 * Ekran czatu.
 *
 * Moduł jest w Etapie 4 i celowo nie ma tu wiadomości ani rozmów. Jedyne, co
 * ten ekran pokazuje ponad zwykły ekran zastępczy, to stan kanału czasu
 * rzeczywistego — bo ten kanał JEST już zaimplementowany i bez tego nie było
 * jak sprawdzić, czy działa.
 */
export default function ChatPage() {
  return (
    <div className="space-y-6">
      <ModulePlaceholder
        name="Chat"
        stage={4}
        description="Wiadomości, grupy, tłumaczenia i tryby dostępności. Model z TIKTAK już stoi — rozmowa, uczestnik z licznikiem nieprzeczytanych, obecność i wiadomość z typem."
        planned={[
          "Rozmowy 1:1 i grupowe, obecność bez liczenia nieprzeczytanych u kogoś, kto patrzy na ekran",
          "Załączniki obrazów, wiadomości głosowe z automatyczną transkrypcją",
          "Tłumaczenie wiadomości na język odbiorcy, z zachowaniem oryginału",
          "Tryby dostępności per rozmowa: napisy, czytanie na głos, podgląd migowy, alerty Morse'a",
        ]}
      />

      <section
        aria-labelledby="realtime-state"
        className="bengos-surface-card mx-auto max-w-2xl"
      >
        <h2
          id="realtime-state"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Kanał czasu rzeczywistego
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Kanał jest zaimplementowany i działa po stronie serwera — po Etapie 4 pójdą nim
          wiadomości i obecność. Poniżej widać jego aktualny stan.
        </p>
        <div className="mt-3">
          <RealtimeIndicator />
        </div>
      </section>
    </div>
  );
}
