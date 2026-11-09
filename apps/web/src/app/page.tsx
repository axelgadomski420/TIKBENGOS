import type { Metadata } from "next";

import { PhoneHub } from "@/components/hub/phone-hub";

export const metadata: Metadata = { title: "Bengos.PL" };

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <PhoneHub />;
}
