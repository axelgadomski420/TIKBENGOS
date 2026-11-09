import type { Metadata } from "next";

import { SearchDesk } from "@/components/home/search-desk";

export const metadata: Metadata = { title: "Wyszukiwarka — BENGOS" };

export default function SearchPage() {
  return <SearchDesk />;
}
