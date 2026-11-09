import type { Metadata } from "next";

import { StudioClient } from "@/components/studio/studio-client";

export const metadata: Metadata = { title: "Tworzenie posta — BENGOS Studio" };

export default function StudioPostPage() {
  return <StudioClient initial="post" />;
}
