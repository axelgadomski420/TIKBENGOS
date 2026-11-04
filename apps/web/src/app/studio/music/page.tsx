import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Muzyka AI — BENGOS Studio" };

/**
 * Docelowy adres tworzenia muzyki z pulpitu.
 *
 * Ekran opisuje wyłącznie zaplanowaną funkcję. Nie uruchamia generatora ani
 * nie pokazuje fałszywej kolejki przed powstaniem workera muzycznego.
 */
export default function StudioMusicPage() {
  return (
    <ModulePlaceholder
      name="Studio — muzyka"
      stage={3}
      description="Generowanie muzyki AI, biblioteka utworów i przypisywanie dźwięku do wideo."
      planned={[
        "Opis utworu i wybór ustawień generowania",
        "Zadanie asynchroniczne z powiadomieniem kanałem czasu rzeczywistego",
        "Biblioteka własnych utworów bez zmyślonych pozycji",
        "Przypisanie utworu do projektu wideo",
      ]}
    />
  );
}
