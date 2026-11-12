import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdoptionRequest } from '../models/adoption-request.model';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private apiUrl = 'http://localhost:8087/elif/api/adoption/requests';

  constructor(private http: HttpClient) {}

  create(request: AdoptionRequest, userId: number): Observable<AdoptionRequest> {
    return this.http.post<AdoptionRequest>(this.apiUrl, request, {
      headers: { 'X-User-Id': userId.toString() }
    });
  }

  getByAdopter(adopterId: number): Observable<AdoptionRequest[]> {
    return this.http.get<AdoptionRequest[]>(`${this.apiUrl}/adopter/${adopterId}`);
  }
  getByShelter(shelterId: number): Observable<AdoptionRequest[]> {
  return this.http.get<AdoptionRequest[]>(`${this.apiUrl}/shelter/${shelterId}`);
}

approve(requestId: number): Observable<AdoptionRequest> {
  return this.http.put<AdoptionRequest>(`${this.apiUrl}/${requestId}/approve`, {});
}

reject(requestId: number, reason: string): Observable<AdoptionRequest> {
  return this.http.put<AdoptionRequest>(`${this.apiUrl}/${requestId}/reject?reason=${reason}`, {});
}

  cancel(id: number, userId: number): Observable<AdoptionRequest> {
    return this.http.put<AdoptionRequest>(`${this.apiUrl}/${id}/cancel`, {}, {
      headers: { 'X-User-Id': userId.toString() }
    });
  }
}