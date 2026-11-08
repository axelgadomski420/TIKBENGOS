import type { Metadata } from "next";

import { DevClient } from "@/components/dev/dev-client";

export const metadata: Metadata = { title: "BENGOS Dev — TIKBENGOS" };

/**
 * Dev — repozytoria, issue, commity i plany zmian.
 *
 * Działa TERAZ przez token serwera (GITHUB_TOKEN): podłączanie repozytoriów
 * z wykrytymi uprawnieniami, zakładanie i komentowanie issue, zamykanie,
 * podgląd commitów, plany zmian z bramką zgody i trwały dziennik operacji.
 *
 * Dojdzie (napisane wprost, nie ukrywane): executor zmian (Aider w piaskownicy)
 * wykonujący zatwierdzone plany — gałąź, commit, pull request. Do jego
 * podłączenia zatwierdzanie planów zwraca uczciwą odmowę zamiast udawać
 * wykonanie.
 */
export default function DevPage() {
  return <DevClient />;
}
