import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Zaloguj się" };

/**
 * Ekran logowania.
 *
 * Kontrakt sesji jest gotowy, a serwerowa warstwa odczytu sesji działa —
 * brakuje tylko formularza. Świadomie nie ma tu atrapy: pole, które nic nie
 * wysyła, byłoby gorsze niż ta informacja.
 */
export default function LoginPage() {
  return (
    <ModulePlaceholder
      name="konto"
      stage={1}
      description="Logowanie, rejestracja i wylogowanie są gotowe po stronie API i opisane w kontrakcie. Ten ekran dołącza do nich w kolejnym kroku tego etapu."
      planned={[
        "Rejestracja z weryfikacją adresu email",
        "Logowanie z opcjonalnym drugim składnikiem (MFA)",
        "Jedno konto dla wszystkich modułów — bez osobnych kont per aplikacja",
      ]}
    />
  );
}
