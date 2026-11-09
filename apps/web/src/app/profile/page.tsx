import type { Metadata } from "next";

import { ProfileBoard } from "@/components/profile/profile-board";

export const metadata: Metadata = { title: "Profil — BENGOS" };

export default function ProfilePage() {
  return <ProfileBoard />;
}
