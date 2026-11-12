import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private apiUrl = 'http://localhost:8087/elif/api/adoption/contracts';

  constructor(private http: HttpClient) {}

  // ── Créer un contrat ──
  create(contract: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, contract);
  }

  // ── Contrats d'un shelter ──
  getByShelter(shelterId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/shelter/${shelterId}`);
  }

  // ── Contrats d'un adoptant ──
  getByAdopter(adopterId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/adoptant/${adopterId}`);
  }

  // ── Détails d'un contrat ──
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // ── ✅ Télécharger le PDF d'un contrat ──
  downloadPdf(contractId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${contractId}/pdf`, {
        responseType: 'blob'
    });
}
}