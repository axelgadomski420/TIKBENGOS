import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Projekt kodu — BENGOS Studio" };

/**
 * Docelowy adres projektu kodu otwieranego z pulpitu.
 *
 * Nie ma tu formularza ani przycisku agenta: połączenie repozytorium i agent
 * kodujący należą do Etapu 5. Użytkownik widzi rzeczywisty zakres i etap prac.
 */
export default function StudioProjectPage() {
  return (
    <ModulePlaceholder
      name="Studio — projekt kodu"
      stage={5}
      description="Opis funkcji, plan zmian w repozytorium i zatwierdzanie pracy agenta kodującego."
      planned={[
        "Wybór połączonego repozytorium z minimalnymi uprawnieniami",
        "Plan zmian przed wykonaniem jakiejkolwiek operacji",
        "Zatwierdzenie gałęzi, commita i pull requesta przez człowieka",
        "Trwały dziennik operacji na kodzie",
      ]}
    />
  );
}
