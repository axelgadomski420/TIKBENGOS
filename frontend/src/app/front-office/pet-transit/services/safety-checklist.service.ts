import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChecklistStats, SafetyChecklistItem } from '../models/safety-checklist.model';

@Injectable({ providedIn: 'root' })
export class SafetyChecklistService {
  private readonly baseUrl = 'http://localhost:8087/elif';

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const sanitizedUserId = this.resolveCurrentUserId();

    return new HttpHeaders({
      'X-User-Id': sanitizedUserId
    });
  }

  private resolveCurrentUserId(): string {
    const keys = ['userId', 'elif_user', 'elif.session.user'];

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      const normalizedRaw = String(raw).trim().replace(/^"+|"+$/g, '');
      if (!normalizedRaw) {
        continue;
      }

      if (/^\d+$/.test(normalizedRaw)) {
        return normalizedRaw;
      }

      try {
        const parsed = JSON.parse(normalizedRaw) as { id?: unknown };
        const parsedId = String(parsed?.id ?? '')
          .trim()
          .replace(/^"+|"+$/g, '');

        if (/^\d+$/.test(parsedId)) {
          return parsedId;
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  getChecklist(planId: number): Observable<SafetyChecklistItem[]> {
    return this.http.get<SafetyChecklistItem[]>(
      `${this.baseUrl}/api/travel-plans/${planId}/checklist`,
      { headers: this.getHeaders() }
    );
  }

  getStats(planId: number): Observable<ChecklistStats> {
    return this.http.get<ChecklistStats>(
      `${this.baseUrl}/api/travel-plans/${planId}/checklist/stats`,
      { headers: this.getHeaders() }
    );
  }

  getChecklistItem(planId: number, itemId: number): Observable<SafetyChecklistItem> {
    return this.http.get<SafetyChecklistItem>(
      `${this.baseUrl}/api/travel-plans/${planId}/checklist/${itemId}`,
      { headers: this.getHeaders() }
    );
  }

  markComplete(planId: number, itemId: number): Observable<SafetyChecklistItem> {
    return this.http.patch<SafetyChecklistItem>(
      `${this.baseUrl}/api/travel-plans/${planId}/checklist/${itemId}/complete`,
      {},
      { headers: this.getHeaders() }
    );
  }

  markUncomplete(planId: number, itemId: number): Observable<SafetyChecklistItem> {
    return this.http.patch<SafetyChecklistItem>(
      `${this.baseUrl}/api/travel-plans/${planId}/checklist/${itemId}/uncomplete`,
      {},
      { headers: this.getHeaders() }
    );
  }
}
