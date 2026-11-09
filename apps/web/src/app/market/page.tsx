import type { Metadata } from "next";

import { MarketClient } from "@/components/market/market-client";

export const metadata: Metadata = { title: "BENGOS Marketplace" };

export default function MarketPage() {
  return <MarketClient />;
}
