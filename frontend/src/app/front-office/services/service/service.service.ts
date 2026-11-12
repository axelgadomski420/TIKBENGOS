import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Catégorie de service
export interface ServiceCategory {
  id: number;
  name: string;
  description: string;
}

// Service côté front
export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  status: string;
  imageUrl?: string;
  clinicName?: string;
  rating: number;
  ratingCount: number;
  category: ServiceCategory;
  provider: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// DTO pour formulaire + CRUD
export interface ServiceDTO {
  id?: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  status: string;
  categoryId: number;
  providerId: number;
  options?: { id: number; name: string }[];
  availabilities?: { id: number; startTime: string; endTime: string }[];
}

// Payload pour création service
export interface CreateServicePayload {
  name: string;
  description: string;
  price: number;
  duration: number;
  status: string;
  categoryId: number;
  providerId: number;
}

// DTO recommandations
export interface RecommendedServiceDTO {
  id: number;
  name: string;
  categoryName: string;
  score: number;
  rating: number;
  imageUrl?: string;
  price: number;
  duration: number;
  providerName: string;
  bookingCount: number;
  trending: boolean;
  topRated: boolean;
  reasonLabel: string;
}

// Avis utilisateur
export interface ServiceReview {
  id?: number;
  serviceId?: number;
  userId: number;
  userFirstName?: string;
  userLastName?: string;
  rating: number;   // 1-5
  comment?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ServiceService {
  private readonly apiUrl = 'http://localhost:8087/elif/api';

  constructor(private http: HttpClient) { }

  // ─── Services ───────────────────────────────────────────────────────────────

  findAll(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services`);
  }

  findByProviderId(providerId: number): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services`, {
      params: new HttpParams().set('providerId', providerId.toString())
    });
  }

  findById(id: number): Observable<ServiceDTO> {
    return this.http.get<ServiceDTO>(`${this.apiUrl}/services/${id}`);
  }

  create(payload: CreateServicePayload): Observable<Service> {
    return this.http.post<Service>(`${this.apiUrl}/services`, payload);
  }

  update(id: number, payload: Partial<CreateServicePayload>): Observable<Service> {
    return this.http.put<Service>(`${this.apiUrl}/services/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/services/${id}`);
  }

  findByCategoryId(categoryId: number): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services/by-category/${categoryId}`);
  }

  findByStatus(status: string): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services/by-status/${status}`);
  }

  // ─── Recommandations ────────────────────────────────────────────────────────

  getRecommendations(userId?: number, currentServiceId?: number, location?: string): Observable<RecommendedServiceDTO[]> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId.toString());
    if (currentServiceId) params = params.set('currentServiceId', currentServiceId.toString());
    if (location) params = params.set('location', location);
    return this.http.get<RecommendedServiceDTO[]>(`${this.apiUrl}/services/recommendations`, { params });
  }

  // ─── Reviews ────────────────────────────────────────────────────────────────

  getReviews(serviceId: number): Observable<ServiceReview[]> {
    return this.http.get<ServiceReview[]>(`${this.apiUrl}/services/${serviceId}/reviews`);
  }

  addReview(serviceId: number, review: ServiceReview): Observable<ServiceReview> {
    return this.http.post<ServiceReview>(`${this.apiUrl}/services/${serviceId}/reviews`, review);
  }

  deleteReview(serviceId: number, reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/services/${serviceId}/reviews/${reviewId}`);
  }
}