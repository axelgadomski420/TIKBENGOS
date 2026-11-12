import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import type {
  EventCapacityResponse,
  EventParticipantResponse,
  WaitlistResponse,
  EventReviewResponse,
  WeatherResponse,
  EventStatsResponse,
  PageResponse,
  EventDetail,
  AdminEventSummary,
  EventEligibilityRule,
  EligibilityRuleRequest
} from '../models/admin-events.models';

import type {
  EventSummary,
  EventCategory
} from '../../../front-office/events/models/event.models';

// ✅ Réexports pour les composants
export type {
  EventSummary,
  AdminEventSummary,
  EventCategory,
  EventCapacityResponse,
  EventParticipantResponse,
  WaitlistResponse,
  EventReviewResponse,
  WeatherResponse,
  EventStatsResponse,
  PageResponse,
  EventDetail,
  EventEligibilityRule,
  EligibilityRuleRequest
};

const BASE = 'http://localhost:8087/elif/api';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES POUR LES DÉTAILS UTILISATEUR
// ═══════════════════════════════════════════════════════════════════════════════

export interface UserInfo {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profilePicture?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  preferences?: {
    notifications: boolean;
    language: string;
    timezone: string;
  };
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
  role: string;
}

export interface PetInfo {
  id: number;
  name: string;
  species: string;
  breed: string;
  ageMonths: number;
  weightKg?: number;
  color?: string;
  isVaccinated: boolean;
  hasLicense: boolean;
  medicalCertificateValid?: boolean;
  veterinarian?: string;
  specialNeeds?: string;
  registrationNumber?: string;
  profileImage?: string;
}

export interface ParticipantDetailsResponse {
  user: UserInfo;
  pet: PetInfo;
  registration: {
    id: number;
    status: string;
    registrationDate: string;
    confirmedAt?: string;
    paymentStatus: string;
    paymentAmount?: number;
    notes?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  eligibilityScores?: {
    totalScore: number;
    breedScore: number;
    healthScore: number;
    experienceScore: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH HELPER
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly userStorageKeys = ['elif_user', 'currentUser'];

  private readStoredUser(): any {
    for (const key of this.userStorageKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch {
        // Ignore malformed JSON and continue with the next key.
      }
    }
    return null;
  }

  getAdminId(): number {
    const user = this.readStoredUser();
    const userId = user?.id;
    if (typeof userId === 'number' && Number.isFinite(userId)) {
      return userId;
    }

    const directUserId = Number(localStorage.getItem('userId'));
    return Number.isFinite(directUserId) && directUserId > 0 ? directUserId : 1;
  }

  getAdminName(): string {
    const user = this.readStoredUser();
    return `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminEventService {
  private url = `${BASE}/events`;
  constructor(private http: HttpClient) {}

  getAll(params: Record<string, any>): Observable<PageResponse<AdminEventSummary>> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    });
    return this.http.get<PageResponse<AdminEventSummary>>(this.url, { params: p });
  }

  getById(id: number): Observable<EventDetail> {
    return this.http.get<EventDetail>(`${this.url}/${id}`);
  }

  update(eventId: number, data: any, userId: number): Observable<EventDetail> {
    return this.http.put<EventDetail>(`${this.url}/${eventId}`, data, { params: { userId } });
  }

  cancel(eventId: number, userId: number): Observable<EventSummary> {
    return this.http.patch<EventSummary>(
      `${this.url}/${eventId}/cancel`, {},
      { params: { userId } }
    );
  }

  delete(eventId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${eventId}`, { params: { userId } });
  }

  getCalendar(year: number, month: number): Observable<Record<string, EventSummary[]>> {
    return this.http.get<Record<string, EventSummary[]>>(`${this.url}/calendar`, {
      params: { year, month }
    });
  }

  getStats(userId: number): Observable<EventStatsResponse> {
    return this.http.get<EventStatsResponse>(`${this.url}/admin/stats`, { params: { userId } });
  }

  // ✅ UPLOAD IMAGE METHODS
  uploadImage(formData: FormData): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.url}/upload-image`, formData);
  }

  createWithImage(formData: FormData, userId: number): Observable<EventDetail> {
    return this.http.post<EventDetail>(this.url, formData, { params: { userId } });
  }

  updateWithImage(eventId: number, formData: FormData, userId: number): Observable<EventDetail> {
    return this.http.put<EventDetail>(`${this.url}/${eventId}`, formData, { params: { userId } });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminCategoryService {
  private url = `${BASE}/event-categories`;
  constructor(private http: HttpClient) {}

  getAll(userId: number): Observable<EventCategory[]> {
    return this.http.get<EventCategory[]>(this.url, { params: { userId } });
  }

  getById(id: number): Observable<EventCategory> {
    return this.http.get<EventCategory>(`${this.url}/${id}`);
  }

  create(data: any, userId: number): Observable<EventCategory> {
    return this.http.post<EventCategory>(this.url, data, { params: { userId } });
  }

  update(id: number, data: any, userId: number): Observable<EventCategory> {
    return this.http.put<EventCategory>(`${this.url}/${id}`, data, { params: { userId } });
  }

  delete(id: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`, { params: { userId } });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPACITÉ
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminCapacityService {
  private url = `${BASE}/events`;
  constructor(private http: HttpClient) {}

  getSnapshot(eventId: number): Observable<EventCapacityResponse> {
    return this.http.get<EventCapacityResponse>(`${this.url}/${eventId}/capacity`);
  }

  recalculate(eventId: number, adminId: number): Observable<EventCapacityResponse> {
    return this.http.post<EventCapacityResponse>(
      `${this.url}/${eventId}/capacity/recalculate`, {},
      { params: { adminId } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICIPANTS
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminParticipantService {
  private url = `${BASE}/events`;
  constructor(private http: HttpClient) {}

  getConfirmed(eventId: number, adminId: number, page = 0, size = 20)
    : Observable<PageResponse<EventParticipantResponse>> {
    return this.http.get<PageResponse<EventParticipantResponse>>(
      `${this.url}/${eventId}/participants`,
      { params: { requesterId: adminId.toString(), page, size } }
    );
  }

  getPending(eventId: number, adminId: number, page = 0, size = 20)
    : Observable<PageResponse<EventParticipantResponse>> {
    return this.http.get<PageResponse<EventParticipantResponse>>(
      `${this.url}/${eventId}/participants/pending`,
      { params: { adminId: adminId.toString(), page, size } }
    );
  }

  approve(participantId: number, adminId: number): Observable<EventParticipantResponse> {
    return this.http.patch<EventParticipantResponse>(
      `${this.url}/participants/${participantId}/approve`, {},
      { params: { adminId } }
    );
  }

  reject(participantId: number, adminId: number): Observable<EventParticipantResponse> {
    return this.http.patch<EventParticipantResponse>(
      `${this.url}/participants/${participantId}/reject`, {},
      { params: { adminId } }
    );
  }

  // ✅ NOUVELLE MÉTHODE : Récupérer les détails complets d'un participant
  getParticipantDetails(registrationId: number, adminId: number): Observable<ParticipantDetailsResponse> {
    return this.http.get<ParticipantDetailsResponse>(
      `${this.url}/participants/${registrationId}/details`,
      { params: { adminId: adminId.toString() } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTE D'ATTENTE (COMPLET)
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminWaitlistService {
  private url = `${BASE}/events`;
  constructor(private http: HttpClient) {}

  getWaitlist(eventId: number, adminId: number, page = 0, size = 20): Observable<PageResponse<WaitlistResponse>> {
    return this.http.get<PageResponse<WaitlistResponse>>(
      `${this.url}/${eventId}/waitlist`,
      { params: { adminId, page, size } }
    );
  }

  getMyWaitlistEntries(userId: number, page = 0, size = 10): Observable<PageResponse<WaitlistResponse>> {
    return this.http.get<PageResponse<WaitlistResponse>>(
      `${this.url}/waitlist/my`,
      { params: { userId, page, size } }
    );
  }

  getMyEntry(eventId: number, userId: number): Observable<WaitlistResponse> {
    return this.http.get<WaitlistResponse>(
      `${this.url}/${eventId}/waitlist/my`,
      { params: { userId } }
    );
  }

  joinWaitlist(eventId: number, userId: number, numberOfSeats: number): Observable<WaitlistResponse> {
    return this.http.post<WaitlistResponse>(
      `${this.url}/${eventId}/waitlist`,
      { numberOfSeats },
      { params: { userId } }
    );
  }

  leaveWaitlist(eventId: number, userId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.url}/${eventId}/waitlist`,
      { params: { userId } }
    );
  }

  confirmEntry(eventId: number, userId: number): Observable<WaitlistResponse> {
    return this.http.post<WaitlistResponse>(
      `${this.url}/${eventId}/waitlist/confirm`,
      {},
      { params: { userId } }
    );
  }

  notifyEntry(eventId: number, entryId: number, adminId: number, deadlineHours = 24): Observable<WaitlistResponse> {
    return this.http.post<WaitlistResponse>(
      `${this.url}/${eventId}/waitlist/${entryId}/notify`,
      {},
      { params: { adminId, deadlineHours } }
    );
  }

  promoteNext(eventId: number, adminId?: number): Observable<{ promoted: boolean }> {
    const params: any = {};
    if (adminId !== undefined) params['adminId'] = adminId;
    return this.http.post<{ promoted: boolean }>(
      `${this.url}/${eventId}/waitlist/promote`,
      {},
      { params }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÉTÉO
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminWeatherService {
  private url = `${BASE}/events`;
  constructor(private http: HttpClient) {}

  getForEvent(eventId: number): Observable<WeatherResponse> {
    return this.http.get<WeatherResponse>(`${this.url}/${eventId}/weather`);
  }

  getWeatherByCityAndDate(city: string, date: string): Observable<WeatherResponse> {
    return this.http.get<WeatherResponse>(`${this.url}/weather`, { 
      params: { 
        city: city,
        date: date
      } 
    });
  }

  getByCity(city: string): Observable<WeatherResponse> {
    return this.http.get<WeatherResponse>(`${this.url}/weather`, { params: { city } });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVIS
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminReviewService {
  private url = `${BASE}/events`;
  constructor(private http: HttpClient) {}

  getReviews(eventId: number, page = 0, size = 10): Observable<PageResponse<EventReviewResponse>> {
    return this.http.get<PageResponse<EventReviewResponse>>(
      `${this.url}/${eventId}/reviews`,
      { params: { page, size } }
    );
  }

  deleteReview(reviewId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/reviews/${reviewId}`, { params: { userId } });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAPPELS
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminReminderService {
  private url = `${BASE}/events`;
  constructor(private http: HttpClient) {}

  cancelAll(eventId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${eventId}/reminders`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminExportService {
  private url = `${BASE}/events`;
  constructor(private http: HttpClient) {}

  exportAllEvents(userId: number): Observable<Blob> {
    return this.http.get(`${this.url}/export/all`, {
      params: { userId },
      responseType: 'blob'
    });
  }

  exportParticipants(eventId: number, userId: number): Observable<Blob> {
    return this.http.get(`${this.url}/${eventId}/export/participants`, {
      params: { userId },
      responseType: 'blob'
    });
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÈGLES D'ÉLIGIBILITÉ (COMPÉTITIONS)
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AdminEligibilityRuleService {
  private url = `${BASE}/eligibility-rules`;
  constructor(private http: HttpClient) {}

  getByCategory(categoryId: number): Observable<EventEligibilityRule[]> {
    return this.http.get<EventEligibilityRule[]>(`${this.url}/categories/${categoryId}`);
  }

  getByEvent(eventId: number): Observable<EventEligibilityRule[]> {
    return this.http.get<EventEligibilityRule[]>(`${this.url}/events/${eventId}`);
  }

  getAll(): Observable<EventEligibilityRule[]> {
    return this.http.get<EventEligibilityRule[]>(this.url);
  }

  getById(ruleId: number): Observable<EventEligibilityRule> {
    return this.http.get<EventEligibilityRule>(`${this.url}/${ruleId}`);
  }

  create(data: EligibilityRuleRequest, userId: number): Observable<EventEligibilityRule> {
    if (data.categoryId) {
      return this.http.post<EventEligibilityRule>(`${this.url}/categories/${data.categoryId}`, data, { params: { adminId: userId } });
    } else if (data.eventId) {
      return this.http.post<EventEligibilityRule>(`${this.url}/events/${data.eventId}`, data, { params: { adminId: userId } });
    }
    return this.http.post<EventEligibilityRule>(this.url, data, { params: { adminId: userId } });
  }

  update(ruleId: number, data: EligibilityRuleRequest, userId: number): Observable<EventEligibilityRule> {
    return this.http.put<EventEligibilityRule>(`${this.url}/${ruleId}`, data, { params: { adminId: userId } });
  }

  delete(ruleId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${ruleId}`, { params: { adminId: userId } });
  }

  hardDelete(ruleId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${ruleId}/hard`, { params: { adminId: userId } });
  }

  setActive(ruleId: number, active: boolean, userId: number): Observable<EventEligibilityRule> {
    return this.http.patch<EventEligibilityRule>(`${this.url}/${ruleId}/active`, { active }, { params: { adminId: userId } });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPETITION ENTRIES
// ═══════════════════════════════════════════════════════════════════════════════
export interface PetCompetitionEntry {
  id: number;
  participantId: number;
  eventId: number;
  eventTitle: string;
  userId: number;
  ownerName: string;
  ownerEmail: string;
  petName: string;
  species: string;
  breed: string;
  ageMonths?: number;
  weightKg?: number;
  sex?: string;
  color?: string;
  isVaccinated: boolean;
  hasLicense: boolean;
  hasMedicalCert: boolean;
  experienceLevel?: number;
  additionalInfo?: string;
  eligibilityScore: number;
  eligibilityVerdict: 'ELIGIBLE' | 'WARNING' | 'INELIGIBLE';
  satisfiedRules?: string;
  warnings?: string;
  participantStatus: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminCompetitionService {
  constructor(private http: HttpClient) {}

  getCompetitionEntries(eventId: number, adminId: number, page = 0, size = 20): Observable<{
    content: PetCompetitionEntry[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    return this.http.get<{
      content: PetCompetitionEntry[];
      totalElements: number;
      totalPages: number;
      size: number;
      number: number;
    }>(`${BASE}/events/${eventId}/competition-entries`, {
      params: { adminId, page, size }
    });
  }

  getCompetitionStats(eventId: number, adminId: number): Observable<{
    totalEntries: number;
    eligibleCount: number;
    warningCount: number;
    ineligibleCount: number;
    averageScore: number;
    topBreeds: Array<{ breed: string; count: number }>;
    topScorers: PetCompetitionEntry[];
  }> {
    return this.http.get<any>(`${BASE}/events/${eventId}/competition-stats`, {
      params: { adminId }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUAL SESSION
// ═══════════════════════════════════════════════════════════════════════════════
export interface VirtualSessionRequest {
  externalRoomUrl?:           string;
  earlyAccessMinutes:         number;
  attendanceThresholdPercent: number;
}

export interface VirtualSessionResponse {
  id:                        number;
  eventId:                   number;
  eventTitle:                string;
  roomUrl:                   string | null;
  status:                    'SCHEDULED' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
  earlyAccessMinutes:        number;
  attendanceThresholdPercent: number;
  openedAt:                  string | null;
  closedAt:                  string | null;
  canJoinNow:                boolean;
  statusMessage:             string;
}

export interface SessionStatsResponse {
  sessionId:          number;
  eventTitle:         string;
  totalRegistered:    number;
  totalJoined:        number;
  averageAttendance:  number;
  certificatesEarned: number;
  participantDetails: AttendanceDetail[];
}

export interface AttendanceDetail {
  userId:              number;
  userName:            string;
  totalMinutesPresent: number;
  attendancePercent:   number;
  certificateEarned:   boolean;
  certificateUrl:      string | null;
  currentlyConnected:  boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminVirtualSessionService {
  constructor(private http: HttpClient) {}

  createSession(eventId: number, adminId: number, request: VirtualSessionRequest): Observable<VirtualSessionResponse> {
    return this.http.post<VirtualSessionResponse>(
      `${BASE}/events/${eventId}/virtual`,
      request,
      { params: { userId: adminId.toString() } }
    );
  }

  getSession(eventId: number, adminId: number): Observable<VirtualSessionResponse> {
    return this.http.get<VirtualSessionResponse>(
      `${BASE}/events/${eventId}/virtual?userId=${adminId}`
    );
  }

  getStats(eventId: number, adminId: number): Observable<SessionStatsResponse> {
    return this.http.get<SessionStatsResponse>(
      `${BASE}/events/${eventId}/virtual/stats?adminId=${adminId}`
    );
  }
}