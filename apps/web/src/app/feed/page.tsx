import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "BENGOS Feed" };

export default function FeedPage() {
  return (
    <ModulePlaceholder
      name="Feed"
      stage={2}
      description="Krótkie wideo, dźwięki, posty i twórcy. Model danych jest gotowy — Post, Tag, Comment, zakładki, reposty i obserwacje przechodzą z TIKTAK bez zmiany kształtu."
      planned={[
        "Wgrywanie wideo do magazynu obiektowego i transkodowanie do wariantów jakościowych",
        "Napisy generowane automatycznie, edytowalne, plus transkrypcja każdego nagrania",
        "Opis dla ekranu bez obrazu — wymagany, nie opcjonalny",
        "Polubienia, komentarze z odpowiedziami, zakładki, reposty, obserwacje",
        "Feed z kursorem: obserwowani, dla Ciebie, odkrywaj z filtrem po tagu",
      ]}
    />
  );
}
