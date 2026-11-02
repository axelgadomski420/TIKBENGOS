import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "BENGOS Chat" };

export default function ChatPage() {
  return (
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
  );
}
