import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "BENGOS Create" };

export default function CreatePage() {
  return (
    <ModulePlaceholder
      name="Create"
      stage={5}
      description="Asystent AI: pomysły, scenariusze, muzyka, kod. Warstwa asystenta to django-ai-assistant z TIKAL — przenoszony jako zależność, nie jako skopiowany kod."
      planned={[
        "Asystent kontekstowy w całej aplikacji, nie osobny czat w osobnym oknie",
        "Kontekst z Twoich projektów, utworów i wideo — nie z cudzej wiedzy ogólnej",
        "Generowanie scenariusza wideo i szkicu utworu z jednego opisu",
        "Klucze do modeli wpisywane w ustawieniach, szyfrowane, nigdy w repozytorium",
      ]}
    />
  );
}
