export type MarketplaceReclamationType =
  | 'DELIVERY'
  | 'DAMAGED_PRODUCT'
  | 'WRONG_ITEM'
  | 'PAYMENT'
  | 'REFUND'
  | 'OTHER';

export type MarketplaceReclamationStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'REJECTED';

export interface MarketplaceReclamation {
  id: number;
  userId: number;
  orderId: number;
  productId: number | null;
  title: string;
  description: string;
  type: MarketplaceReclamationType;
  status: MarketplaceReclamationStatus;
  responseMalek: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  image?: string | null;
}

export interface MarketplaceReclamationForm {
  id?: number | null;
  userId: number | null;
  orderId: number | null;
  productId?: number | null;
  title: string;
  description: string;
  type: MarketplaceReclamationType;
  image?: string | null;
  imageFile?: File | null;
}