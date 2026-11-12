// src/app/front-office/events/services/event.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EventSummary,
  EventDetail,
  EventCategory,       
  PaginatedResponse,
  EventParticipantRequest,
  EventParticipantResponse,
  WaitlistResponse,
  WeatherResponse,
  EventReviewRequest,
  EventReviewResponse
} from '../models/event.models';

// ✅ Importer EligibilityResult depuis le modèle (source de vérité unique)
import { EligibilityResult } from '../models/eligibility.models';
export { EligibilityResult };  // ✅ Réexporter pour les autres composants

// ✅ Interface pour les données de l'animal
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

@Injectable({ providedIn: 'root' })
export class EventService {
  private apiUrl = 'http://localhost:8087/elif/api/events';
  private baseUrl = 'http://localhost:8087/elif/api';

  constructor(private http: HttpClient) {}

  // ============================================
  // GET all events (public)
  // ============================================
  getAll(params: {
    keyword?: string;
    categoryId?: number | null;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<PaginatedResponse<EventSummary>> {
    let httpParams = new HttpParams();
    
    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId.toString());
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size) httpParams = httpParams.set('size', params.size.toString());
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    
    return this.http.get<PaginatedResponse<EventSummary>>(this.apiUrl, { params: httpParams });
  }

  // ============================================
  // GET event by ID (public)
  // ============================================
  getById(id: number): Observable<EventDetail> {
    return this.http.get<EventDetail>(`${this.apiUrl}/${id}`);
  }

  // ============================================
  // GET categories (public)
  // ============================================
  getCategories(): Observable<EventCategory[]> {
    return this.http.get<EventCategory[]>(`${this.baseUrl}/event-categories`);
  }

  // ============================================
  // POST register to event (USER only)
  // ============================================
  register(eventId: number, userId: number, request: EventParticipantRequest): Observable<EventParticipantResponse> {
    return this.http.post<EventParticipantResponse>(
      `${this.apiUrl}/${eventId}/join`,
      request,
      { params: { userId: userId.toString() } }
    );
  }

  // ✅ NOUVEAU : Inscription avec données de l'animal (compétition)
  registerWithPet(eventId: number, userId: number, petData: PetRegistrationData): Observable<EventParticipantResponse> {
    return this.http.post<EventParticipantResponse>(
      `${this.apiUrl}/${eventId}/join-with-pet`,
      { numberOfSeats: 1, petData },
      { params: { userId: userId.toString() } }
    );
  }

  // ✅ Vérification d'éligibilité - retourne EligibilityResult du modèle
  checkEligibility(eventId: number, petData: any): Observable<EligibilityResult> {
    return this.http.post<EligibilityResult>(
      `${this.apiUrl}/${eventId}/check-eligibility`, 
      petData
    );
  }

  // ============================================
  // DELETE leave event (USER only)
  // ============================================
  leaveEvent(eventId: number, userId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${eventId}/leave`,
      { params: { userId: userId.toString() } }
    );
  }

  // ============================================
  // POST join waitlist (when event is FULL)
  // ============================================
  joinWaitlist(eventId: number, userId: number, request: EventParticipantRequest): Observable<WaitlistResponse> {
    return this.http.post<WaitlistResponse>(
      `${this.apiUrl}/${eventId}/waitlist`,
      request,
      { params: { userId: userId.toString() } }
    );
  }

  // ============================================
  // DELETE leave waitlist
  // ============================================
  leaveWaitlist(eventId: number, userId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${eventId}/waitlist`,
      { params: { userId: userId.toString() } }
    );
  }

  // ============================================
  // GET my waitlist entry for an event
  // ============================================
  getMyWaitlistEntry(eventId: number, userId: number): Observable<WaitlistResponse> {
    return this.http.get<WaitlistResponse>(
      `${this.apiUrl}/${eventId}/waitlist/my`,
      { params: { userId: userId.toString() } }
    );
  }

  // ============================================
  // POST confirm waitlist offer (within 24h)
  // ============================================
  confirmWaitlistEntry(eventId: number, userId: number): Observable<WaitlistResponse> {
    return this.http.post<WaitlistResponse>(
      `${this.apiUrl}/${eventId}/waitlist/confirm`,
      {},
      { params: { userId: userId.toString() } }
    );
  }

  // ============================================
  // GET my registrations
  // ============================================
  getMyRegistrations(userId: number, page: number = 0, size: number = 10): Observable<PaginatedResponse<EventParticipantResponse>> {
    return this.http.get<PaginatedResponse<EventParticipantResponse>>(
      `${this.apiUrl}/registrations/my`,
      { params: { userId: userId.toString(), page, size } }
    );
  }

  // ============================================
  // GET my waitlists (all events)
  // ============================================
  getMyWaitlists(userId: number, page: number = 0, size: number = 10): Observable<PaginatedResponse<WaitlistResponse>> {
    return this.http.get<PaginatedResponse<WaitlistResponse>>(
      `${this.apiUrl}/waitlist/my`,
      { params: { userId: userId.toString(), page, size } }
    );
  }

  // ============================================
  // GET weather for an event
  // ============================================
  getEventWeather(eventId: number): Observable<WeatherResponse> {
    return this.http.get<WeatherResponse>(`${this.apiUrl}/${eventId}/weather`);
  }

  // ============================================
  // GET weather by city
  // ============================================
  getWeatherByCity(city: string): Observable<WeatherResponse> {
    return this.http.get<WeatherResponse>(`${this.apiUrl}/weather`, { params: { city } });
  }

  // ============================================
  // GET reviews for an event
  // ============================================
  getEventReviews(eventId: number, page: number = 0, size: number = 10): Observable<PaginatedResponse<EventReviewResponse>> {
    return this.http.get<PaginatedResponse<EventReviewResponse>>(
      `${this.apiUrl}/${eventId}/reviews`,
      { params: { page, size } }
    );
  }

  // ============================================
  // POST submit a review (USER only, after event COMPLETED)
  // ============================================
  submitReview(eventId: number, userId: number, review: EventReviewRequest): Observable<EventReviewResponse> {
    return this.http.post<EventReviewResponse>(
      `${this.apiUrl}/${eventId}/reviews`,
      review,
      { params: { userId: userId.toString() } }
    );
  }

  // ============================================
  // PUT update a review (USER only, own review)
  // ============================================
  updateReview(reviewId: number, userId: number, review: EventReviewRequest): Observable<EventReviewResponse> {
    return this.http.put<EventReviewResponse>(
      `${this.apiUrl}/reviews/${reviewId}`,
      review,
      { params: { userId: userId.toString() } }
    );
  }

  // ============================================
  // DELETE a review (USER only, own review)
  // ============================================
  deleteReview(reviewId: number, userId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/reviews/${reviewId}`,
      { params: { userId: userId.toString() } }
    );
  }

  // ============================================
  // GET calendar grouped by date
  // ============================================
  getCalendar(year: number, month: number): Observable<Record<string, EventSummary[]>> {
    return this.http.get<Record<string, EventSummary[]>>(
      `${this.apiUrl}/calendar`,
      { params: { year: year.toString(), month: month.toString() } }
    );
  }

  // ============================================
  // GET my waitlist entries (alias)
  // ============================================
  getMyWaitlistEntries(userId: number, page: number = 0, size: number = 100): Observable<PaginatedResponse<WaitlistResponse>> {
    return this.http.get<PaginatedResponse<WaitlistResponse>>(
      `${this.apiUrl}/waitlist/my`,
      { params: { userId, page, size } }
    );
  }
}
