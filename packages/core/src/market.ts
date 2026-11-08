/**
 * Kontrakty marketplace BENGOS.
 *
 * Cena zawsze w groszach (Integer). Float na pieniądzach jest błędem,
 * który widać po tysiącu transakcji.
 *
 * Jeden model użytkownika (accounts.User). Sprzedawca nie kupuje własnego
 * przedmiotu — walidacja po stronie API.
 *
 * assetRef to klucz w magazynie obiektów, nigdy ścieżka na dysku kontenera.
 */

export type MarketItemKind =
  | "preset"
  | "sound"
  | "video-template"
  | "music"
  | "code-project"
  | "caption-pack"
  | "model";

export type MarketItemState = "draft" | "published" | "suspended";

export interface MarketItem {
  id: string;
  sellerId: string;
  kind: MarketItemKind;
  title: string;
  summary: string;
  description: string;
  priceMinor: number;
  currency: "PLN" | "EUR" | "USD";
  state: MarketItemState;
  previewUrl: string | null;
  assetRef: string;
  license: "personal" | "commercial" | "extended";
  createdAt: string;
  publishedAt: string | null;
}

export interface MarketPurchase {
  id: string;
  itemId: string;
  buyerId: string;
  amountMinor: number;
  currency: string;
  state: "pending" | "paid" | "refunded" | "failed";
  provider: "stripe" | "payu" | "manual";
  createdAt: string;
}

export interface MarketPayout {
  id: string;
  sellerId: string;
  amountMinor: number;
  currency: string;
  state: "queued" | "sent" | "failed";
  periodStart: string;
  periodEnd: string;
}
