import type { Metadata } from "next";

import { FeedList } from "@/components/feed/feed-list";

export const metadata: Metadata = { title: "BENGOS Feed — bengtok" };

export default function FeedPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-[var(--bengos-accent)]">bengtok</h1>
        <p className="mt-1 max-w-2xl text-[var(--bengos-text-muted)]">
          Krótkie wideo, dźwięki, posty i twórcy. Feed, obserwacje, polubienia, komentarze.
        </p>
      </header>
      <FeedList />
    </div>
  );
}
