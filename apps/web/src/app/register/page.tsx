import { redirect } from "next/navigation";

/**
 * Adres /register — kanoniczne wejście rejestracji.
 *
 * ── DLACZEGO PRZEKIEROWANIE, A NIE DRUGA BRAMA ────────────────────────
 * Rejestracja to nie osobny ekran, tylko tryb bramy na /login#rejestracja
 * (jedna implementacja formularza, dwa wejścia — patrz login-form.tsx).
 * Druga kopia bramy tutaj dublowałaby stan trybu i mogła się rozjechać
 * z dolnym odnośnikiem „rejestracja”. Przekierowanie zachowuje jedno
 * miejsce prawdy, a świat dostaje stały adres: zapisane zakładki i linki
 * z zewnątrz wołają /register bez znajomości wewnętrznego skrótu.
 */
export default function RegisterPage() {
  redirect("/login#rejestracja");
}