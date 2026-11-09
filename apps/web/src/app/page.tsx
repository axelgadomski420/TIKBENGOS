import type { Metadata } from "next";

import { HomeEntry } from "@/components/home/home-entry";

export const metadata: Metadata = { title: "Bengos.PL" };

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <HomeEntry />;
}
