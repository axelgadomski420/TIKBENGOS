import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  status: string;
  imageUrl?: string;
  category?: ServiceCategory;
  provider: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ServiceCategory {
  id: number;
  name: string;
  description: string;
}

export interface ServiceDTO {
  id?: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  status: string;
  categoryId: number;
  providerId: number;
}

export interface ServiceOption {
  id?: number;
  name: string;
  price: number;
}

export interface CreateServicePayload {
  name: string;
  description: string;
  price: number;
  duration: number;
  status: string;
  imageUrl?: string;
  categoryId: number;
  providerId: number;
  options: ServiceOption[];
}

@Injectable({ providedIn: 'root' })
export class ServiceService {
  private readonly apiUrl = 'http://localhost:8087/elif/api';

  constructor(private http: HttpClient) { }

  // Récupérer tous les services
  findAll(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services`);
  }

  // Récupérer les services d'un provider spécifique
  findByProviderId(providerId: number): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services`, {
      params: new HttpParams().set('providerId', providerId.toString())
    });
  }

  // Récupérer un service par ID
  findById(id: number): Observable<Service> {
    return this.http.get<Service>(`${this.apiUrl}/services/${id}`);
  }

  // Créer un nouveau service
  create(payload: CreateServicePayload): Observable<Service> {
    return this.http.post<Service>(`${this.apiUrl}/services`, payload);
  }

  // Mettre à jour un service
  update(id: number, payload: Partial<CreateServicePayload>): Observable<Service> {
    return this.http.put<Service>(`${this.apiUrl}/services/${id}`, payload);
  }

  // Supprimer un service
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/services/${id}`);
  }

  // Récupérer les services par catégorie
  findByCategoryId(categoryId: number): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services/by-category/${categoryId}`);
  }

  // Récupérer les services par statut
  findByStatus(status: string): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services/by-status/${status}`);
  }
}