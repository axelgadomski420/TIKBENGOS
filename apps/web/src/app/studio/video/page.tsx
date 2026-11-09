import type { Metadata } from "next";

import { StudioClient } from "@/components/studio/studio-client";

export const metadata: Metadata = { title: "Tworzenie wideo — BENGOS Studio" };

export default function StudioVideoPage() {
  return <StudioClient initial="video" />;
}
