

// ─── Réexports front-office ───────────────────────────────────────────────────
export type { EventSummary, EventCategory, Page } from '../../../front-office/events/models/event.models';
import type { EventSummary, EventCategory, Page } from '../../../front-office/events/models/event.models';

// ─── Extension pour l'admin (ajout du compteur pending) ───────────────────────
export interface AdminEventSummary extends EventSummary {
  pendingCount: number;  // Nombre d'inscriptions en attente d'approbation
}

// ─── Alias ────────────────────────────────────────────────────────────────────
export type PageResponse<T> = Page<T>;

// ─── Event Detail ─────────────────────────────────────────────────────────────
export interface EventDetail {
  id: number;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  remainingSlots: number;
  coverImageUrl: string;
  status: string;
  category: EventCategory;
  organizerName: string;
  organizerId: number;
  createdAt: string;
  averageRating: number;
  reviewCount: number;
    isOnline: boolean;    // ← AJOUTER

}
// ============================================
// À AJOUTER dans admin-events.models.ts
// ============================================

// ─── Popularité Events ─────────────────────────────────────────

export interface PopularEventDTO {
  eventId: number;
  title: string;
  categoryName: string;
  categoryIcon: string;
  startDate: string;
  location: string;
  popularityScore: number;
  uniqueViews: number;
  totalInteractions: number;
  conversionRate: number;
  remainingSlots: number;
}

export interface EventPopularityDetailDTO {
  eventId: number;
  title: string;
  totalViews: number;
  uniqueViews: number;
  searchClicks: number;
  detailOpens: number;
  waitlistJoins: number;
  registrations: number;
  reviewsPosted: number;
  conversionRate: number;
  popularityScore: number;
  trend: string;  // "RISING" | "STABLE" | "DECLINING"
}

export interface PopularityDashboardDTO {
  topEvents: PopularEventDTO[];
  neglectedEvents: PopularEventDTO[];
  interactionsByType: Record<string, number>;
  totalViewsToday: number;
  totalInteractionsThisWeek: number;
  averageConversionRate: number;
  period: {
    from: string;
    to: string;
    label: string;
  };
}
// ─── Capacité ─────────────────────────────────────────────────────────────────
export interface EventCapacityResponse {
  eventId:               number;
  eventTitle:            string;
  maxParticipants:       number;
  remainingSlots:        number;
  confirmedParticipants: number;
  pendingParticipants:   number;
  waitlistCount:         number;
  fillRatePercent:       number;
  isFull:                boolean;
  hasWaitlist:           boolean;
  status:                string;
}

// ─── Participant ──────────────────────────────────────────────────────────────
export interface EventParticipantResponse {
  id:             number;
  eventId:        number;
  eventTitle:     string;
  userId:         number;
  userName:       string;
  numberOfSeats:  number;
  status:         'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'ATTENDED';
  registeredAt:   string;
  eligibilityScore?: number;  // ✅ NOUVEAU : Score d'éligibilité (0-100)
  petInfo?: {                  // ✅ NOUVEAU : Infos de l'animal
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
  };
}

// ─── Liste d'attente (Version complète avec statuts 24h) ──────────────────────
export interface WaitlistResponse {
  id:             number;
  eventId:        number;
  eventTitle:     string;
  userId:         number;
  userName:       string;
  numberOfSeats:  number;
  position:       number;
  peopleAhead:    number;
  joinedAt:       string;
  notified:       boolean;
  
  // ✅ NOUVEAUX CHAMPS pour le délai de 24h
  status: 'WAITING' | 'NOTIFIED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  notifiedAt?: string;
  confirmationDeadline?: string;
  minutesRemainingToConfirm?: number;
  statusMessage?: string;
}

// ─── Avis ─────────────────────────────────────────────────────────────────────
export interface EventReviewResponse {
  id:        number;
  eventId:   number;
  userId:    number;
  userName:  string;
  rating:    number;
  comment:   string;
  createdAt: string;
}

// ─── Météo ────────────────────────────────────────────────────────────────────
export interface WeatherResponse {
  temperature:       number;
  description:       string;
  icon:              string;
  humidity:          number;
  windSpeed:         number;
  condition:         'SUNNY' | 'CLOUDY' | 'RAINY' | 'STORMY' | 'SNOWY' | 'UNKNOWN';
  recommendation:    'INDOOR' | 'OUTDOOR';
  recommendationMsg: string;
  eventDay:          boolean;
  city:              string;
}

// ─── Statistiques Admin ───────────────────────────────────────────────────────
export interface EventStatsResponse {
  totalEvents:       number;
  totalParticipants: number;
  eventsThisWeek:    number;
  eventsThisMonth:   number;
  averageFillRate:   number;
  eventsByStatus:    Record<string, number>;
  eventsByCategory:  Record<string, number>;
  monthlyTrend:      Record<string, number>;
  topEvents:         EventSummary[];
}

// ─── Rappels ──────────────────────────────────────────────────────────────────
export type ReminderType = 'J2' | 'H24' | 'H2';

export interface EventReminderInfo {
  id:           number;
  eventId:      number;
  eventTitle:   string;
  userId:       number;
  userEmail:    string;
  reminderTime: string;
  type:         ReminderType;
  sent:         boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ NOUVEAU : RÈGLES D'ÉLIGIBILITÉ POUR COMPÉTITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type RuleCriteria = 
  | 'ALLOWED_BREEDS'
  | 'FORBIDDEN_BREEDS'
  | 'ALLOWED_SPECIES'
  | 'MIN_AGE_MONTHS'
  | 'MAX_AGE_MONTHS'
  | 'MIN_WEIGHT_KG'
  | 'MAX_WEIGHT_KG'
  | 'VACCINATION_REQUIRED'
  | 'LICENSE_REQUIRED'
  | 'MEDICAL_CERT_REQUIRED'
  | 'ALLOWED_SEXES'
  | 'MIN_EXPERIENCE_LEVEL'
  | 'MAX_PARTICIPANTS_PER_OWNER'
  | 'SAME_OWNER_RESTRICTION'
  | 'ALLOWED_COLORS'
  | 'FORBIDDEN_COLORS';

export type RuleValueType = 'LIST' | 'NUMBER' | 'BOOLEAN';

export interface EventEligibilityRule {
  id: number;
  eventId: number | null;
  categoryId: number | null;
  criteria: RuleCriteria;
  valueType: RuleValueType;
  listValues: string | null;
  numericValue: number | null;
  booleanValue: boolean | null;
  hardReject: boolean;
  rejectionMessage: string | null;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EligibilityRuleRequest {
  eventId?: number | null;
  categoryId?: number | null;
  criteria: RuleCriteria;
  valueType: RuleValueType;
  listValues?: string | null;
  numericValue?: number | null;
  booleanValue?: boolean | null;
  hardReject?: boolean;
  rejectionMessage?: string | null;
  priority?: number;
  active?: boolean;
}

// ─── Résultat d'évaluation d'éligibilité ──────────────────────────────────────
export interface EligibilityViolation {
  criteria: RuleCriteria;
  message: string;
  blocking: boolean;
}

export interface EligibilityResult {
  eventId: number;
  verdict: 'ELIGIBLE' | 'WARNING' | 'INELIGIBLE';
  score: number;
  violations: EligibilityViolation[];
  satisfiedRules: string[];
  isEligible: boolean;
  isIneligible: boolean;
  hasWarnings: boolean;
  getBlockingViolations: () => EligibilityViolation[];
  getSoftViolations: () => EligibilityViolation[];
}

// ─── Données de l'animal pour participation ───────────────────────────────────
export interface PetRegistrationData {
  breed: string;
  species: string;
  ageMonths: number;
  weightKg: number | null;
  isVaccinated: boolean;
  hasLicense: boolean;
  hasMedicalCert: boolean;
  sex: string;
  experienceLevel: number;
  color: string;
}

// ─── Tri table ────────────────────────────────────────────────────────────────
export type SortField = 'title' | 'startDate' | 'status' | 'remainingSlots' | 'averageRating' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field:     SortField;
  direction: SortDirection;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export interface ToastMessage {
  id:      number;
  msg:     string;
  type:    'success' | 'error' | 'info' | 'warning';
  icon:    string;
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────
export interface ConfirmAction {
  title:    string;
  message:  string;
  label:    string;
  variant:  'danger' | 'warning';
  fn:       () => void;
}