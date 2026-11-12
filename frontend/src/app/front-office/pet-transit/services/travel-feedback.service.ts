import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  FeedbackType,
  ProcessingStatus,
  TravelFeedback,
  TravelFeedbackCreateRequest,
  TravelFeedbackUpdateRequest
} from '../models/travel-feedback.model';

export interface TravelFeedbackFilters {
  type?: FeedbackType;
  status?: ProcessingStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

interface PagePayload<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class TravelFeedbackService {
  private readonly baseUrl = 'http://localhost:8087/elif/api';

  constructor(private readonly http: HttpClient) {}

  createFeedback(
    planId: number,
    request: TravelFeedbackCreateRequest
  ): Observable<TravelFeedback> {
    return this.http
      .post<TravelFeedback>(
        `${this.baseUrl}/travel-plans/${planId}/feedback`,
        request,
        { headers: this.headers() }
      )
      .pipe(catchError((error) => throwError(() => this.toError(error, 'Failed to submit feedback.'))));
  }

  getFeedbacksForPlan(planId: number): Observable<TravelFeedback[]> {
    return this.http
      .get<TravelFeedback[]>(
        `${this.baseUrl}/travel-plans/${planId}/feedback`,
        { headers: this.headers() }
      )
      .pipe(catchError((error) => throwError(() => this.toError(error, 'Failed to load feedbacks.'))));
  }

  getMyFeedbacks(filters: TravelFeedbackFilters = {}): Observable<TravelFeedback[]> {
    return this.http
      .get<TravelFeedback[] | PagePayload<TravelFeedback>>(`${this.baseUrl}/feedback/my`, {
        headers: this.headers(),
        params: this.toFeedbackFiltersParams(filters)
      })
      .pipe(map((payload) => this.extractContent(payload)))
      .pipe(catchError((error) => throwError(() => this.toError(error, 'Failed to load your feedbacks.'))));
  }

  updateFeedback(
    planId: number,
    feedbackId: number,
    request: TravelFeedbackUpdateRequest
  ): Observable<TravelFeedback> {
    return this.http
      .put<TravelFeedback>(
        `${this.baseUrl}/travel-plans/${planId}/feedback/${feedbackId}`,
        request,
        { headers: this.headers() }
      )
      .pipe(catchError((error) => throwError(() => this.toError(error, 'Failed to update feedback.'))));
  }

  deleteFeedback(planId: number, feedbackId: number): Observable<void> {
    return this.http
      .delete<void>(
        `${this.baseUrl}/travel-plans/${planId}/feedback/${feedbackId}`,
        { headers: this.headers() }
      )
      .pipe(catchError((error) => throwError(() => this.toError(error, 'Failed to delete feedback.'))));
  }

  getCurrentUserId(): string {
    const keys = ['userId', 'elif_user', 'elif.session.user'];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (/^\d+$/.test(trimmed)) return trimmed;
      try {
        const parsed = JSON.parse(trimmed) as { id?: number | string };
        if (parsed?.id !== undefined && parsed.id !== null) {
          const idStr = String(parsed.id).trim();
          if (idStr) return idStr;
        }
      } catch {
        continue;
      }
    }
    return '';
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ 'X-User-Id': this.getCurrentUserId() });
  }

  private toError(error: unknown, fallback: string): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new Error('Unable to reach the server. Please check your connection.');
      }
      const raw = error.error;
      if (raw && typeof raw === 'object') {
        const candidate = raw as Record<string, unknown>;
        const msg = candidate['message'] ?? candidate['error'];
        if (typeof msg === 'string' && msg.trim()) {
          return new Error(msg.trim());
        }
      }
    }
    return new Error(fallback);
  }

  private toFeedbackFiltersParams(filters: TravelFeedbackFilters): HttpParams {
    let params = new HttpParams();

    const type = String(filters.type ?? '').trim();
    if (type) {
      params = params.set('type', type);
    }

    const status = String(filters.status ?? '').trim();
    if (status) {
      params = params.set('status', status);
    }

    const search = String(filters.search ?? '').trim();
    if (search) {
      params = params.set('search', search);
    }

    const startDate = String(filters.startDate ?? '').trim();
    if (startDate) {
      params = params.set('startDate', startDate);
    }

    const endDate = String(filters.endDate ?? '').trim();
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    const page = Number(filters.page);
    if (Number.isFinite(page) && page >= 0) {
      params = params.set('page', String(page));
    }

    const size = Number(filters.size);
    if (Number.isFinite(size) && size > 0) {
      params = params.set('size', String(size));
    }

    return params;
  }

  private extractContent(payload: TravelFeedback[] | PagePayload<TravelFeedback>): TravelFeedback[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    return Array.isArray(payload?.content) ? payload.content : [];
  }
}
