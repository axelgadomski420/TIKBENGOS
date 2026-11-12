export type TransportType = 'CAR' | 'TRAIN' | 'PLANE' | 'BUS';

export type TravelPlanStatus =
  | 'DRAFT'
  | 'IN_PREPARATION'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type SafetyStatus = 'PENDING' | 'VALID' | 'ALERT' | 'INVALID';

export type RequiredDocumentType =
  | 'PET_PASSPORT'
  | 'RABIES_VACCINE'
  | 'HEALTH_CERTIFICATE'
  | 'TRANSPORT_AUTHORIZATION';

export type CurrencyCode = 'TND' | 'EUR' | 'USD';

const EURO_COUNTRY_KEYS = new Set([
  'AT',
  'AUT',
  'AUSTRIA',
  'BE',
  'BEL',
  'BELGIUM',
  'CY',
  'CYP',
  'CYPRUS',
  'DE',
  'DEU',
  'GERMANY',
  'EE',
  'EST',
  'ESTONIA',
  'ES',
  'ESP',
  'SPAIN',
  'FI',
  'FIN',
  'FINLAND',
  'FR',
  'FRA',
  'FRANCE',
  'GR',
  'GRC',
  'GREECE',
  'HR',
  'HRV',
  'CROATIA',
  'IE',
  'IRL',
  'IRELAND',
  'IT',
  'ITA',
  'ITALY',
  'LT',
  'LTU',
  'LITHUANIA',
  'LU',
  'LUX',
  'LUXEMBOURG',
  'LV',
  'LVA',
  'LATVIA',
  'MT',
  'MLT',
  'MALTA',
  'NL',
  'NLD',
  'NETHERLANDS',
  'PT',
  'PRT',
  'PORTUGAL',
  'SI',
  'SVN',
  'SLOVENIA',
  'SK',
  'SVK',
  'SLOVAKIA'
]);

function normalizeCountryKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function normalizeCurrencyCode(value: unknown): CurrencyCode | null {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'TND' || normalized === 'EUR' || normalized === 'USD') {
    return normalized;
  }

  return null;
}

export function mapDestinationCountryToCurrency(country: string | null | undefined): CurrencyCode {
  const normalized = normalizeCountryKey(String(country ?? ''));
  if (!normalized) {
    return 'USD';
  }

  if (
    normalized === 'TN' ||
    normalized === 'TUN' ||
    normalized === 'TUNISIA' ||
    normalized.includes('TUNISIA')
  ) {
    return 'TND';
  }

  const tokens = normalized.split(' ');
  if (tokens.some((token) => EURO_COUNTRY_KEYS.has(token)) || EURO_COUNTRY_KEYS.has(normalized)) {
    return 'EUR';
  }

  return 'USD';
}

export interface TravelPlanCreateRequest {
  petId: number;
  destinationId: number;
  origin: string;
  transportType: TransportType;
  travelDate: string;
  returnDate?: string;
  estimatedTravelHours?: number | null;
  estimatedTravelCost?: number | null;
  currency?: string | null;
  animalWeight?: number | null;
  cageLength?: number | null;
  cageWidth?: number | null;
  cageHeight?: number | null;
}

export interface TravelPlanUpdateRequest {
  petId: number;
  origin: string;
  transportType: TransportType;
  travelDate: string;
  returnDate?: string;
  estimatedTravelHours?: number | null;
  estimatedTravelCost?: number | null;
  currency?: string | null;
  animalWeight?: number | null;
  cageLength?: number | null;
  cageWidth?: number | null;
  cageHeight?: number | null;
}

export interface TravelPlanSummary {
  id: number;
  destinationTitle: string;
  destinationCountry: string;
  destinationRegion?: string;
  destinationType?: string;
  destinationCoverImageUrl?: string;
  transportType?: TransportType;
  travelDate: string;
  returnDate?: string;
  status: TravelPlanStatus;
  hasFeedback?: boolean;
  readinessScore: number;
  safetyStatus: SafetyStatus;
  petId?: number;
  petName?: string;
  requiredDocuments?: RequiredDocumentType[];
  createdAt: string;
}

export interface TravelPlan {
  id: number;
  ownerId: number;
  ownerName?: string;
  petId?: number;
  petName?: string;
  destinationId: number;
  destinationTitle: string;
  destinationCountry: string;
  destinationRegion?: string;
  destinationType?: string;
  destinationCoverImageUrl?: string;
  requiredDocuments?: RequiredDocumentType[];
  origin: string;
  transportType: TransportType;
  travelDate: string;
  returnDate: string;
  estimatedTravelHours: number;
  estimatedTravelCost: number;
  currency: string;
  animalWeight: number;
  cageLength: number;
  cageWidth: number;
  cageHeight: number;
  hydrationIntervalMinutes: number;
  requiredStops: number;
  readinessScore: number;
  safetyStatus: SafetyStatus;
  status: TravelPlanStatus;
  hasFeedback?: boolean;
  adminDecisionComment?: string;
  reviewedByAdminName?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const TRANSPORT_TYPE_LABELS: Record<TransportType, string> = {
  CAR: 'Car',
  TRAIN: 'Train',
  PLANE: 'Plane',
  BUS: 'Bus'
};

export const TRAVEL_PLAN_STATUS_CONFIG: Record<
  TravelPlanStatus,
  { label: string; iconClass: string; color: string; bgColor: string }
> = {
  DRAFT: {
    label: 'Draft',
    iconClass: 'edit',
    color: '#6b7280',
    bgColor: '#f3f4f6'
  },
  IN_PREPARATION: {
    label: 'In Preparation',
    iconClass: 'construction',
    color: '#b45309',
    bgColor: '#fef3c7'
  },
  SUBMITTED: {
    label: 'Submitted',
    iconClass: 'send',
    color: '#7c3aed',
    bgColor: '#ede9fe'
  },
  APPROVED: {
    label: 'Approved',
    iconClass: 'check_circle',
    color: '#15803d',
    bgColor: '#dcfce7'
  },
  REJECTED: {
    label: 'Rejected',
    iconClass: 'cancel',
    color: '#b91c1c',
    bgColor: '#fee2e2'
  },
  COMPLETED: {
    label: 'Completed',
    iconClass: 'task_alt',
    color: '#0f766e',
    bgColor: '#ccfbf1'
  },
  CANCELLED: {
    label: 'Cancelled',
    iconClass: 'block',
    color: '#6b7280',
    bgColor: '#f3f4f6'
  }
};

export const SAFETY_STATUS_CONFIG: Record<
  SafetyStatus,
  { label: string; iconClass: string; color: string; bgColor: string }
> = {
  PENDING: {
    label: 'Pending',
    iconClass: 'schedule',
    color: '#6b7280',
    bgColor: '#f3f4f6'
  },
  VALID: {
    label: 'Valid',
    iconClass: 'verified_user',
    color: '#15803d',
    bgColor: '#dcfce7'
  },
  ALERT: {
    label: 'Alert',
    iconClass: 'warning',
    color: '#b45309',
    bgColor: '#fef3c7'
  },
  INVALID: {
    label: 'Invalid',
    iconClass: 'gpp_bad',
    color: '#b91c1c',
    bgColor: '#fee2e2'
  }
};

export const EDITABLE_TRAVEL_PLAN_STATUSES: TravelPlanStatus[] = ['DRAFT', 'IN_PREPARATION'];

export const DELETABLE_TRAVEL_PLAN_STATUSES: TravelPlanStatus[] = [
  'DRAFT',
  'IN_PREPARATION',
  'REJECTED',
  'CANCELLED',
  'COMPLETED'
];

