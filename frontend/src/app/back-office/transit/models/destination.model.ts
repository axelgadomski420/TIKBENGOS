export type DestinationType =
  | 'BEACH'
  | 'MOUNTAIN'
  | 'CITY'
  | 'FOREST'
  | 'ROAD_TRIP'
  | 'INTERNATIONAL';

export type TransportType = 'CAR' | 'TRAIN' | 'PLANE' | 'BUS';

export type DocumentType =
  | 'PET_PASSPORT'
  | 'RABIES_VACCINE'
  | 'HEALTH_CERTIFICATE'
  | 'TRANSPORT_AUTHORIZATION';

export type DestinationStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type DestinationProgrammingMode = 'DRAFT' | 'PUBLISH' | 'SCHEDULE';

export type PetFriendlyLevel = 1 | 2 | 3 | 4 | 5;

export type DestinationStatusFilter =
  | 'ALL'
  | 'PUBLISHED'
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ARCHIVED';

export interface DestinationCarouselImage {
  id?: number;
  imageUrl: string;
  displayOrder?: number | null;
}

export interface Destination {
  id?: number;
  title: string;
  country: string;
  region: string;
  destinationType: DestinationType;
  recommendedTransportType: TransportType;
  petFriendlyLevel: PetFriendlyLevel;
  description: string;
  safetyTips: string;
  requiredDocuments: DocumentType[];
  coverImageUrl: string;
  carouselImages?: DestinationCarouselImage[];
  latitude?: number | null;
  longitude?: number | null;
  status: DestinationStatus;
  createdAt?: string;
  updatedAt?: string;
  scheduledPublishAt?: string | null;
  scheduledDate?: string | null;
  publishedAt?: string | null;
  linkedPlansCount?: number;
}

export interface DestinationCreateRequest {
  title: string;
  country: string;
  region: string;
  destinationType: DestinationType;
  recommendedTransportType: TransportType;
  petFriendlyLevel: PetFriendlyLevel;
  description: string;
  safetyTips: string;
  requiredDocuments: DocumentType[];
  coverImageUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DestinationUpdateRequest extends DestinationCreateRequest {
  replaceCarouselImages?: boolean;
}
