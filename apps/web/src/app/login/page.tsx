import type { Metadata } from "next";

import { LoginGate } from "@/components/auth/login-gate";

export const metadata: Metadata = { title: "Logowanie" };

/**
 * Adres /login — kanoniczne wejście logowania.
 *
 * ── STRONA JEST CIENKA, BO BRAMA ŻYJE W POWŁOCE ────────────────────────
 * Bez sesji nie widać niczego (decyzja właściciela): AppShell przy stanie
 * anonima rysuje LoginGate zamiast aplikacji — na KAŻDEJ trasie, nie tylko
 * tutaj. Ta strona istnieje, bo potrzebny jest stały adres: OAuth wraca tu
 * z komunikatem odmowy (login-form.tsx czyta ?oauth=), odnośnik „rejestracja”
 * prowadzi na /login#rejestracja, i to tu prowadzą zapisane zakładki.
 *
 * Dla zalogowanego ta sama brama pokaże kartę „Jesteś zalogowany” — adres
 * nie może być ślepą ścianą po powrocie z dostawcy OAuth.
 */
export default function LoginPage() {
  return <LoginGate />;
}
