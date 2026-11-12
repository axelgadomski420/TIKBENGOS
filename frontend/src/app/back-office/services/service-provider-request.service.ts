import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';

export interface ServiceProviderRequest {
  id?: number;
  userId: number;
  userFullName?: string;
  message: string;
  status: RequestStatus;
  createdAt?: string;
  reviewedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ServiceProviderRequestService {
  private readonly apiUrl = 'http://localhost:8087/elif/api/provider-request';

  constructor(private http: HttpClient) {}

  /** Soumettre une demande */
  createRequest(
    userId: number,
    fullName: string,
    email: string,
    phone: string,
    description: string,
    cvFile: File | null
  ): Observable<ServiceProviderRequest> {
    const formData = new FormData();
    formData.append('userId', userId.toString());
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('description', description);
    if (cvFile) {
      formData.append('cv', cvFile);
    }

    return this.http.post<ServiceProviderRequest>(this.apiUrl, formData);
  }

  /** Récupérer la demande du user connecté */
  getMyRequest(userId: number): Observable<ServiceProviderRequest> {
    return this.http.get<ServiceProviderRequest>(`${this.apiUrl}/request/${userId}`);
  }

  /** Admin : toutes les demandes */
  getAllRequests(): Observable<ServiceProviderRequest[]> {
    return this.http.get<ServiceProviderRequest[]>(`${this.apiUrl}/requests`);
  }

  /** Admin : approuver */
  approveRequest(id: number): Observable<ServiceProviderRequest> {
    return this.http.put<ServiceProviderRequest>(`${this.apiUrl}/request/${id}/approve`, {});
  }

  /** Admin : refuser */
  rejectRequest(id: number): Observable<ServiceProviderRequest> {
    return this.http.put<ServiceProviderRequest>(`${this.apiUrl}/request/${id}/reject`, {});
  }

  /** Vérification rapide — retourne true si APPROVED */
  checkApproval(userId: number): Observable<{ approved: boolean; userId: number }> {
    return this.http.get<{ approved: boolean; userId: number }>(`${this.apiUrl}/check/${userId}`);
  }
}
