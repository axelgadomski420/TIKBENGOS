export interface Shelter {
  id?: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  licenseNumber?: string;
  verified?: boolean;
  averageRating?: number;
  totalReviews?: number;
  description?: string;
  logoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}