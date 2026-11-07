import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "BENGOS Studio" };

/**
 * Ekran Studia.
 *
 * `planned` są tu ułożone w kolejności, w jakiej użytkownik przechodzi przez
 * pracę: najpierw surowy materiał, potem dźwięk, potem publikacja, na końcu
 * kod. Kolejność w siatce czyta się od lewej do prawej i z góry na dół, więc
 * lista jest jednocześnie opisem zakresu i mapą przebiegu pracy.
 *
 * Opisy są dłuższe niż w pozostałych modułach, bo Studio zbiera cztery różne
 * rodzaje twórczości i jedno zdanie na pozycję nie wystarcza, żeby odróżnić
 * „wideo” od „projektu kodu”.
 */
export default function StudioPage() {
  return (
    <ModulePlaceholder
      name="Studio"
      stage={2}
      description="Tworzenie: wideo, muzyka AI, posty i projekty kodu. To tu zbiegają się TIKTAK i TIKMUSIC — dwie dawne aplikacje, jedno miejsce pracy."
      planned={[
        "Wideo: nagranie albo wgranie, podgląd, napisy, publikacja",
        "Muzyka AI: opis utworu, kolejka, biblioteka, przypisanie do wideo",
        "Post: tekst, wideo albo dźwięk, z opisem dla ekranu bez obrazu",
        "Projekt kodu: opis funkcji, plan zmian, zatwierdzenie pull requesta",
      ]}
    />
  );
}
