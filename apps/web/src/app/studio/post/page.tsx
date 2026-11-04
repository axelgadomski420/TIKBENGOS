import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Tworzenie posta — BENGOS Studio" };

/**
 * Docelowy adres tworzenia posta z karty „Stwórz teraz”.
 *
 * Do czasu wdrożenia Etapu 2 nie przyjmujemy treści, których nie ma gdzie
 * zapisać. Opis dostępności pozostaje częścią kontraktu przyszłego formularza.
 */
export default function StudioPostPage() {
  return (
    <ModulePlaceholder
      name="Studio — post"
      stage={2}
      description="Tworzenie postów tekstowych, wideo i dźwiękowych oraz publikacja w BENGOS Feed."
      planned={[
        "Tekst, wideo albo dźwięk w jednym edytorze",
        "Wymagany opis treści nietekstowych",
        "Napisy i transkrypcja dla nagrań",
        "Podgląd i publikacja po zapisaniu wersji roboczej",
      ]}
    />
  );
}
