import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AtRiskPet {
  petId: number;
  petName: string;
  petType: string;
  petBreed?: string;
  petAge?: number;
  petGender?: string;
  petSize?: string;
  petPhotos?: string;
  specialNeeds?: string;
  spayedNeutered?: boolean;
  shelterId: number;
  shelterName: string;
  shelterEmail?: string;
  createdAt: string;
  daysInShelter: number;
  requestCount: number;
  lastRequestDate?: string;
  riskScore: number;
  riskLevel: string;
  riskColor: string;
  riskFactors: string[];
  recommendations: string[];
}

// ✅ AJOUTER CETTE INTERFACE
export interface AtRiskStats {
  totalAnalyzed: number;
  critical: number;
  atRisk: number;
  watch: number;
  avgDaysInShelter: number;
  petsWithNoRequests: number;
}

@Injectable({
  providedIn: 'root'
})
export class AtRiskService {
  private apiUrl = 'http://localhost:8087/elif/api/adoption/at-risk';

  constructor(private http: HttpClient) {}

  getAll(): Observable<AtRiskPet[]> {
    return this.http.get<AtRiskPet[]>(this.apiUrl);
  }

  getCritical(): Observable<AtRiskPet[]> {
    return this.http.get<AtRiskPet[]>(`${this.apiUrl}/critical`);
  }

  getByShelter(shelterId: number): Observable<AtRiskPet[]> {
    return this.http.get<AtRiskPet[]>(`${this.apiUrl}/shelter/${shelterId}`);
  }

  getStats(): Observable<AtRiskStats> {
    return this.http.get<AtRiskStats>(`${this.apiUrl}/stats`);
  }
}