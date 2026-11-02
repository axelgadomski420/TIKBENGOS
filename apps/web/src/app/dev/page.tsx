import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "BENGOS Dev" };

export default function DevPage() {
  return (
    <ModulePlaceholder
      name="Dev"
      stage={5}
      description="Repozytoria, issue, pull requesty i agent kodujący. Warstwa agenta to Aider z TIKGIT — uruchamiany w piaskownicy, nigdy jako proces serwerowy z Twoim tokenem."
      planned={[
        "Połączenie GitHuba jako aplikacja, z tokenem o najmniejszych potrzebnych uprawnieniach",
        "Przeglądanie repozytoriów, gałęzi i issue",
        "Opis funkcji zmienia się w plan zmian, który widzisz przed wykonaniem",
        "Zatwierdzenie człowieka przed każdą gałęzią, commitem i pull requestem",
        "Dziennik każdej operacji na kodzie — trwały i nieusuwalny",
      ]}
    />
  );
}
