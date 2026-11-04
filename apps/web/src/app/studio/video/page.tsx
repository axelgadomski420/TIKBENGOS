import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Tworzenie wideo — BENGOS Studio" };

/**
 * Docelowy adres karty „Stwórz teraz” dla wideo.
 *
 * Trasa istnieje, żeby wejście z pulpitu nie kończyło się błędem 404. Nie ma
 * formularza uploadu, ponieważ magazyn i transkodowanie należą do Etapu 2.
 */
export default function StudioVideoPage() {
  return (
    <ModulePlaceholder
      name="Studio — wideo"
      stage={2}
      description="Nagrywanie i wgrywanie wideo, podgląd, napisy oraz publikacja w BENGOS Feed."
      planned={[
        "Nagranie albo wgranie wideo do magazynu obiektowego",
        "Podgląd i transkodowanie jako zadanie asynchroniczne",
        "Edytowalne napisy, transkrypcja i opis dla ekranu bez obrazu",
        "Publikacja po zakończeniu przetwarzania",
      ]}
    />
  );
}
