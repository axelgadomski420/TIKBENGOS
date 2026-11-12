export type DestinationType =
  | 'BEACH'
  | 'MOUNTAIN'
  | 'CITY'
  | 'FOREST'
  | 'ROAD_TRIP'
  | 'INTERNATIONAL';

export type TransportType = 'CAR' | 'TRAIN' | 'PLANE' | 'BUS';

export type DestinationStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export interface DestinationImage {
  id: number;
  imageUrl: string;
  displayOrder: number;
}

export interface TravelDestinationSummary {
  id: number;
  title: string;
  country: string;
  region?: string;
  destinationType: DestinationType;
  recommendedTransportType: TransportType;
  petFriendlyLevel: number;
  coverImageUrl?: string;
  status: DestinationStatus;
}

export interface TravelDestination extends TravelDestinationSummary {
  description?: string;
  safetyTips?: string;
  requiredDocuments: string[];
  carouselImages: DestinationImage[];
  latitude?: number;
  longitude?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const DESTINATION_TYPE_CONFIG: Record<
  DestinationType,
  {
    label: string;
    icon: string;
    iconClass: string;
    color: string;
    bgColor: string;
    image: string;
  }
> = {
  BEACH: {
    label: 'Beach',
    icon: 'beach_access',
    iconClass: 'fa-solid fa-umbrella-beach',
    color: '#0277bd',
    bgColor: '#e1f5fe',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400'
  },
  MOUNTAIN: {
    label: 'Mountain',
    icon: 'terrain',
    iconClass: 'fa-solid fa-mountain',
    color: '#37474f',
    bgColor: '#eceff1',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400'
  },
  CITY: {
    label: 'City',
    icon: 'location_city',
    iconClass: 'fa-solid fa-city',
    color: '#283593',
    bgColor: '#e8eaf6',
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400'
  },
  FOREST: {
    label: 'Forest',
    icon: 'forest',
    iconClass: 'fa-solid fa-tree',
    color: '#2e7d32',
    bgColor: '#e8f5e9',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400'
  },
  ROAD_TRIP: {
    label: 'Road Trip',
    icon: 'directions_car',
    iconClass: 'fa-solid fa-road',
    color: '#e65100',
    bgColor: '#fff3e0',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400'
  },
  INTERNATIONAL: {
    label: 'International',
    icon: 'flight',
    iconClass: 'fa-solid fa-globe',
    color: '#6a1b9a',
    bgColor: '#f3e5f5',
    image: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400'
  }
};

export const TRANSPORT_CONFIG: Record<
  TransportType,
  {
    label: string;
    icon: string;
    iconClass: string;
  }
> = {
  CAR: { label: 'Car', icon: 'directions_car', iconClass: 'fa-solid fa-car-side' },
  TRAIN: { label: 'Train', icon: 'train', iconClass: 'fa-solid fa-train' },
  PLANE: { label: 'Plane', icon: 'flight', iconClass: 'fa-solid fa-plane-departure' },
  BUS: { label: 'Bus', icon: 'directions_bus', iconClass: 'fa-solid fa-bus' }
};

export const DOCUMENT_CONFIG: Record<
  string,
  {
    label: string;
    icon: string;
    iconClass: string;
  }
> = {
  PET_PASSPORT: {
    label: 'Pet Passport',
    icon: 'badge',
    iconClass: 'fa-solid fa-passport'
  },
  RABIES_VACCINE: {
    label: 'Rabies Vaccine',
    icon: 'vaccines',
    iconClass: 'fa-solid fa-syringe'
  },
  HEALTH_CERTIFICATE: {
    label: 'Health Certificate',
    icon: 'medical_services',
    iconClass: 'fa-solid fa-file-medical'
  },
  TRANSPORT_AUTHORIZATION: {
    label: 'Transport Authorization',
    icon: 'assignment',
    iconClass: 'fa-solid fa-file-signature'
  }
};

