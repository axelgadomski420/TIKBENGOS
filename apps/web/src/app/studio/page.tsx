import type { Metadata } from "next";

import { StudioClient } from "@/components/studio/studio-client";

export const metadata: Metadata = { title: "BENGOS Studio" };

export default function StudioPage() {
  return <StudioClient />;
}
