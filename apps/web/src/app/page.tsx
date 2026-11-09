import type { Metadata } from "next";

import { HomeDashboard } from "@/components/home/home-dashboard";

export const metadata: Metadata = { title: "Bengos.PL" };

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <HomeDashboard />;
}
