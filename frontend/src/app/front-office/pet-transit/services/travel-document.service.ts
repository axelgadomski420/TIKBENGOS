import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TravelDocument } from '../models/travel-document.model';

export type TravelDocumentResponse = TravelDocument;

@Injectable({ providedIn: 'root' })
export class TravelDocumentService {
  private readonly baseUrl = 'http://localhost:8087/elif/api';

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const sanitizedUserId = this.resolveCurrentUserId();

    console.log('[TravelDocumentService] userId resolved from localStorage:', sanitizedUserId);
    console.log('[TravelDocumentService] X-User-Id header value:', sanitizedUserId);

    return new HttpHeaders({ 'X-User-Id': sanitizedUserId });
  }

  getPlanById(planId: number): Observable<any> {
    const url = `${this.baseUrl}/travel-plans/${planId}`;
    const headers = this.getHeaders();
    this.logRequest('GET', url, headers, planId);

    return this.http.get<any>(url, { headers });
  }

  getDocuments(planId: number): Observable<TravelDocumentResponse[]> {
    const url = `${this.baseUrl}/travel-plans/${planId}/documents`;
    const headers = this.getHeaders();
    this.logRequest('GET', url, headers, planId);

    return this.http.get<TravelDocumentResponse[]>(url, { headers });
  }

  getDocumentById(planId: number, docId: number): Observable<TravelDocumentResponse> {
    const url = `${this.baseUrl}/travel-plans/${planId}/documents/${docId}`;
    const headers = this.getHeaders();
    this.logRequest('GET', url, headers, planId);

    return this.http.get<TravelDocumentResponse>(url, { headers });
  }

  uploadDocument(planId: number, formData: FormData): Observable<TravelDocumentResponse> {
    const url = `${this.baseUrl}/travel-plans/${planId}/documents`;
    const headers = this.getHeaders();
    this.logRequest('POST', url, headers, planId);

    return this.http.post<TravelDocumentResponse>(url, formData, { headers });
  }

  updateDocument(planId: number, docId: number, formData: FormData): Observable<TravelDocumentResponse> {
    const url = `${this.baseUrl}/travel-plans/${planId}/documents/${docId}`;
    const headers = this.getHeaders();
    this.logRequest('PUT', url, headers, planId);

    return this.http.put<TravelDocumentResponse>(url, formData, { headers });
  }

  deleteDocument(planId: number, docId: number): Observable<void> {
    const url = `${this.baseUrl}/travel-plans/${planId}/documents/${docId}`;
    const headers = this.getHeaders();
    this.logRequest('DELETE', url, headers, planId);

    return this.http.delete<void>(url, { headers });
  }

  getDestination(destinationId: number): Observable<any> {
    const url = `${this.baseUrl}/destinations/${destinationId}`;
    const headers = this.getHeaders();
    this.logRequest('GET', url, headers);

    return this.http.get<any>(url, { headers });
  }

  private logRequest(method: string, url: string, headers: HttpHeaders, planId?: number): void {
    console.log('[TravelDocumentService] planId:', planId ?? 'N/A');
    console.log('[TravelDocumentService] request:', method, url);
    console.log('[TravelDocumentService] headers:', {
      'X-User-Id': headers.get('X-User-Id') ?? ''
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
        const parsedId = String(parsed?.id ?? '').trim().replace(/^"+|"+$/g, '');
        if (/^\d+$/.test(parsedId)) {
          return parsedId;
        }
      } catch {
        continue;
      }
    }

    return '';
  }
}
