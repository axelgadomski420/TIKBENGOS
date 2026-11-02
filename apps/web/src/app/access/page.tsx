import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "BENGOS Access" };

export default function AccessPage() {
  return (
    <ModulePlaceholder
      name="Access"
      stage={4}
      description="Język migowy, napisy, czytanie na głos, pisanie głosem, Morse i wibracje. Warstwa rozpoznawania migów z TIKMIG jest przenoszona niemal bez zmian — jako osobna usługa, bo model potrzebuje własnego środowiska."
      planned={[
        "Rozpoznawanie migów: 250 znaków amerykańskiego języka migowego, nie PJM",
        "Uczciwe ostrzeżenie na ekranie o tym, czego system nie potrafi — bez obiecywania pełnego tłumaczenia",
        "Napisy i transkrypcje z edycją, czytanie na głos, pisanie głosem",
        "Alerty Morse'a przez wibracje na urządzeniach, które je mają",
      ]}
    />
  );
}
