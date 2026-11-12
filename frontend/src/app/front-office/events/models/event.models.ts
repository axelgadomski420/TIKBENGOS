export interface EventCategory {
  id: number;
  name: string;
  icon: string | null;
  description: string;
  requiresApproval: boolean;
  competitionMode: boolean;
}

export interface EventMatch {
  eventId: number;
  score: number;
  label: 'perfect' | 'great' | 'good' | 'maybe';
  reason: string;
  eligible: boolean;
  eligibilityNote?: string;
}

export interface AiMatchResult {
  summary: string;
  matches: EventMatch[];
  noMatchReason?: string;
}

export interface StreamEvent {
  type: 'token' | 'done' | 'error';
  content: string;
  result?: AiMatchResult;
}

export interface EventSummary {
  id: number;
  title: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  remainingSlots: number;
  coverImageUrl: string;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'FULL';
  category: EventCategory | null;
  organizerName: string;
  organizerId?: number;
  averageRating: number;
  reviewCount: number;
  createdAt?: string;
  avgEligibilityScore?: number;
}

export interface EventDetail extends EventSummary {
  suggestedEvents?: EventSummary[];
  isOnline?: boolean;
}

export interface EventAnalyticsSnapshot {
  eventId: number;
  title: string;
  views: number;
  clicks: number;
  engagement: number;
  registrations: number;
  popularityScore: number;
  liveRank: number | null;
  lastUpdatedAt: string | null;
}

export interface PopularEventRanking {
  eventId: number;
  rank: number;
  title: string;
  categoryName: string;
  categoryIcon: string;
  startDate: string;
  location: string;
  popularityScore: number;
  views: number;
  clicks: number;
  engagement: number;
  uniqueViews: number;
  totalInteractions: number;
  registrations: number;
  conversionRate: number;
  remainingSlots: number;
  lastUpdatedAt: string | null;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface EventParticipantRequest {
  numberOfSeats: number;
  petData?: {
    petName: string;
    breed: string;
    species: string;
    ageMonths: number;
    weightKg: number;
    isVaccinated: boolean;
    hasLicense: boolean;
    hasMedicalCert: boolean;
    sex: string;
    experienceLevel: number;
    color: string;
    additionalInfo?: string;
  };
  pets?: any[];
}

export interface EventParticipantResponse {
  id: number;
  eventId: number;
  eventTitle: string;
  userId: number;
  userName: string;
  numberOfSeats: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED';
  registeredAt: string;
}

export interface WaitlistResponse {
  id: number;
  eventId: number;
  eventTitle: string;
  userId: number;
  userName: string;
  numberOfSeats: number;
  position: number;
  peopleAhead: number;
  joinedAt: string;
  notified: boolean;
  status: 'WAITING' | 'NOTIFIED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  notifiedAt?: string;
  confirmationDeadline?: string;
  minutesRemainingToConfirm?: number;
  statusMessage?: string;
}

export interface WeatherResponse {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  condition: 'SUNNY' | 'CLOUDY' | 'RAINY' | 'STORMY' | 'SNOWY';
  recommendation: 'INDOOR' | 'OUTDOOR';
  recommendationMsg: string;
  eventDay: boolean;
  city: string;
}

export interface EventReviewRequest {
  rating: number;
  comment: string;
}

export interface EventReviewResponse {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface EventRecommendation {
  event: EventSummary;
  score: number;
  reason: string;
  matchedByCategory: boolean;
  matchedByPopularity: boolean;
  matchedByRating: boolean;
  breakdown?: {
    categoryScore: number;
    popularityScore: number;
    ratingScore: number;
    proximityScore: number;
    slotsScore: number;
    totalScore: number;
    isOnline: boolean;
  };
}

export const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Upcoming',
  ONGOING: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FULL: 'Full',
};

export const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#2d7a4f',
  ONGOING: '#2a6fb1',
  COMPLETED: '#6b7280',
  CANCELLED: '#e53e3e',
  FULL: '#e07a20',
};

export const SORT_OPTIONS = [
  { value: 'startDate,asc', label: 'Closest first' },
  { value: 'startDate,desc', label: 'Farthest first' },
  { value: 'averageRating,desc', label: 'Best rated' },
  { value: 'remainingSlots,asc', label: 'Almost full' },
];

export const WAITLIST_STATUS_LABELS: Record<string, string> = {
  WAITING: 'Waiting',
  NOTIFIED: 'Offer sent',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export const WAITLIST_STATUS_COLORS: Record<string, string> = {
  WAITING: '#6b7280',
  NOTIFIED: '#f59e0b',
  CONFIRMED: '#10b981',
  CANCELLED: '#ef4444',
  EXPIRED: '#9ca3af',
};
