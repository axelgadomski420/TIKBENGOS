import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AI_ENGLISH_INSTRUCTION } from './ai-description.service';

const BASE = 'http://localhost:8087/elif/api';

export interface EventCoachAnalysisRequest {
  title: string;
  description: string;
  date: string | null;
  location: string;
  animalTypes: string[];
  maxCapacity: number;
  previousAnalysis: string;
  appliedChanges: string[];
}

export interface EventCoachRecommendation {
  field: string;
  reason: string;
  suggested_value: string | number | string[] | null;
}

export interface EventCoachAnalysisResponse {
  score: number;
  prediction_attendance: number;
  prediction_engagement: number;
  analysis: string;
  recommendations: EventCoachRecommendation[];
}

@Injectable({ providedIn: 'root' })
export class EventCoachService {
  private readonly url = `${BASE}/events/intelligence/coach`;

  constructor(private http: HttpClient) {}

  analyzeEvent(payload: EventCoachAnalysisRequest): Observable<EventCoachAnalysisResponse> {
    return this.http.post<EventCoachAnalysisResponse>(this.url, {
      title: payload.title?.trim() || '',
      description: payload.description?.trim() || '',
      date: payload.date || null,
      location: payload.location?.trim() || '',
      animalTypes: payload.animalTypes ?? [],
      maxCapacity: payload.maxCapacity,
      previousAnalysis: payload.previousAnalysis?.trim() || '',
      appliedChanges: payload.appliedChanges ?? [],
      instruction: AI_ENGLISH_INSTRUCTION
    });
  }
}
