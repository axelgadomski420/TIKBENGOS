"use client";

import { LoginGate } from "@/components/auth/login-gate";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { useSession } from "@/lib/session-context";

/**
 * Pierwsza strona: logowanie i rejestracja na jednym ekranie.
 * Po sesji ten sam adres pokazuje menu dookoła tygrysa.
 */
export function HomeEntry() {
  const { status } = useSession();
  if (status === "loading") {
    return <div className="min-h-dvh bg-[#05070d]" aria-busy="true" />;
  }
  if (status === "authenticated") return <HomeDashboard />;
  return <LoginGate />;
}
