import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "BENGOS Studio" };

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
