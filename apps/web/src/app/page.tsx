import type { Metadata } from "next";

import { AssistantClient } from "@/components/create/assistant-client";
import { ModuleBranches } from "@/components/home/module-branches";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "BENGOS" };

export default function HomePage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--bengos-surface)]" />
        <div className="absolute left-1/2 top-16 size-[30rem] -translate-x-1/2 rounded-full bg-[var(--bengos-accent)] opacity-[0.10] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.07] blur-3xl" />
      </div>
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-10 px-4 pb-28 pt-8 md:pb-12">
        <header className="flex flex-col items-center text-center">
          <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)] uppercase tracking-[0.32em] text-[var(--bengos-accent)]">{BRAND.name}</h1>
          <p className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">{BRAND.tagline}</p>
        </header>
        <AssistantClient />
        <ModuleBranches />
      </div>
    </div>
  );
}
