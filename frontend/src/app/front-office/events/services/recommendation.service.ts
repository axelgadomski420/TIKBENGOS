// src/app/front-office/events/services/recommendation.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventRecommendation, EventSummary } from '../models/event.models';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  
  // ✅ CORRECTION : Utiliser le bon endpoint
  // Votre backend a un contrôleur dédié sur /api/recommendations
  private apiUrl = 'http://localhost:8087/elif/api/recommendations';

  constructor(private http: HttpClient) {}

  getPersonalizedRecommendations(userId: number, limit: number = 10): Observable<EventRecommendation[]> {
    console.log(`📡 Calling: ${this.apiUrl}/personalized?userId=${userId}&limit=${limit}`);
    return this.http.get<EventRecommendation[]>(`${this.apiUrl}/personalized?userId=${userId}&limit=${limit}`);
  }

  getTrendingEvents(limit: number = 10): Observable<EventSummary[]> {
    return this.http.get<EventSummary[]>(`${this.apiUrl}/trending?limit=${limit}`);
  }

  refreshRecommendations(userId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/refresh?userId=${userId}`, {});
  }
}