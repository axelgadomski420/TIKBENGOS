import type { Metadata } from "next";

import { StudioClient } from "@/components/studio/studio-client";

export const metadata: Metadata = { title: "Projekt kodu — BENGOS Studio" };

export default function StudioProjectPage() {
  return <StudioClient initial="code" />;
}
