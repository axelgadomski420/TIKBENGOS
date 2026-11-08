import type { Metadata } from "next";

import { AccessTools } from "@/components/access/access-tools";

export const metadata: Metadata = {
  title: "BENGOS Access — TIKBENGOS",
};

/**
 * Dostępność — narzędzia działające w przeglądarce.
 *
 * Działa TERAZ: syntezator mowy (czytanie tekstu na głos), rozpoznawanie
 * mowy po polsku (wpisywanie głosem), alfabet Morse’a z wibracją
 * (dotykowy kanał informacji dla osób głuchych i niewidomych).
 *
 * Dojdzie (i jest o tym napisane poniżej, nie ukrywane): napisy w wideo
 * (worker mediów), tłumacz polskiego języka migowego (osobny worker),
 * napisy w czacie per rozmowa.
 */
export default function AccessPage() {
  return (
    <div className="space-y-6">
      <AccessTools />
    </div>
  );
}
