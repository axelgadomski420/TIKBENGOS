import type { Metadata } from "next";

import { ProfileIdentity } from "@/components/profile/profile-identity";

export const metadata: Metadata = { title: "Profil — BENGOS" };

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-[var(--bengos-accent)]">Profil</h1>
        <p className="mt-1 text-[var(--bengos-text-muted)]">
          Tożsamość, twórczość i ustawienia konta.
        </p>
      </header>
      <ProfileIdentity />
      <section className="bengos-surface-card">
        <h2 className="text-xl font-medium">Twórczość</h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Twoje wideo, muzyka, posty i projekty pojawią się tutaj po publikacji ze Studio i bengtok.
        </p>
      </section>
    </div>
  );
}
