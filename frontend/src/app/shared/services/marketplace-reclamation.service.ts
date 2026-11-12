import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MarketplaceReclamation,
  MarketplaceReclamationForm,
  MarketplaceReclamationStatus,
  MarketplaceReclamationType
} from '../models/reclamation.model';

export type { MarketplaceReclamation, MarketplaceReclamationForm, MarketplaceReclamationStatus, MarketplaceReclamationType } from '../models/reclamation.model';

@Injectable({ providedIn: 'root' })
export class MarketplaceReclamationService {
  private readonly api = environment.marketplaceReclamationApiUrl;

  constructor(private readonly http: HttpClient) {}

  create(payload: MarketplaceReclamationForm): Observable<MarketplaceReclamation> {
    return this.createReclamation(payload);
  }

  createReclamation(reclamation: MarketplaceReclamationForm): Observable<MarketplaceReclamation> {
    return this.http.post<MarketplaceReclamation>(this.api, this.buildFormData(reclamation));
  }

  updateReclamation(id: number, reclamation: MarketplaceReclamationForm): Observable<MarketplaceReclamation> {
    return this.http.put<MarketplaceReclamation>(`${this.api}/${id}`, this.buildFormData(reclamation));
  }

  getById(id: number): Observable<MarketplaceReclamation> {
    return this.http.get<MarketplaceReclamation>(`${this.api}/${id}`);
  }

  getByUser(userId: number): Observable<MarketplaceReclamation[]> {
    return this.http.get<MarketplaceReclamation[]>(`${this.api}/user/${userId}`);
  }

  getAll(): Observable<MarketplaceReclamation[]> {
    return this.http.get<MarketplaceReclamation[]>(this.api);
  }

  updateStatus(id: number, status: MarketplaceReclamationStatus, responseMalek?: string): Observable<MarketplaceReclamation> {
    return this.http.put<MarketplaceReclamation>(`${this.api}/${id}/status`, { status, responseMalek });
  }

  getImageUrl(id: number): string {
    return `${this.api}/${id}/image`;
  }

  private buildFormData(reclamation: MarketplaceReclamationForm): FormData {
    const formData = new FormData();

    const payload = {
      userId: reclamation.userId,
      orderId: reclamation.orderId,
      productId: reclamation.productId ?? null,
      title: reclamation.title,
      description: reclamation.description,
      type: reclamation.type,
      image: reclamation.image ?? null
    };

    formData.append('reclamation', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

    if (reclamation.imageFile) {
      formData.append('image', reclamation.imageFile);
    }

    return formData;
  }
}
