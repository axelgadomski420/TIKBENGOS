import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';

export interface MissionMatch {
  serviceId: number;
  serviceName: string;
  category: string;
  matchScore: number;
}

export interface ProviderRequest {
  id?: number;
  userId?: number;
  fullName?: string;
  email?: string;
  phone?: string;
  description?: string;
  cvUrl?: string;
  status?: RequestStatus;
  createdAt?: string;
  reviewedAt?: string;
  // ── Analyse intelligente du CV ──────────────────
  cvSummary?: string;
  coherenceScore?: number;
  missions?: MissionMatch[];
}

@Injectable({ providedIn: 'root' })
export class ProviderRequestService {
  private readonly apiUrl = 'http://localhost:8087/elif/api/provider-request';

  constructor(private http: HttpClient) {}
  
  /** Retourner l'URL complète pour accéder au CV */
  getCvUrl(fileName: string): string {
    return `${this.apiUrl}/cv/${fileName}`;
  }

  /** Soumettre une demande (FormData avec CV + userId) */
  createRequest(formData: FormData): Observable<ProviderRequest> {
    return this.http.post<ProviderRequest>(this.apiUrl, formData);
  }

  /** Récupérer MA demande par userId */
  getMyRequest(userId: number): Observable<ProviderRequest> {
    return this.http.get<ProviderRequest>(`${this.apiUrl}/me/${userId}`);
  }

  /** Admin : toutes les demandes */
  getAllRequests(): Observable<ProviderRequest[]> {
    return this.http.get<ProviderRequest[]>(this.apiUrl);
  }

  /** Admin : approuver */
  approve(id: number): Observable<ProviderRequest> {
    return this.http.put<ProviderRequest>(`${this.apiUrl}/${id}/approve`, {});
  }

  /** Admin : refuser */
  reject(id: number): Observable<ProviderRequest> {
    return this.http.put<ProviderRequest>(`${this.apiUrl}/${id}/reject`, {});
  }
}
