import type { Metadata } from "next";

import { CleanMenu } from "@/components/home/clean-menu";

export const metadata: Metadata = { title: "BENGOS" };

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#05080f] px-4 py-8">
      <CleanMenu />
    </div>
  );
}
