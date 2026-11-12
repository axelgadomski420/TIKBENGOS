import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServiceAvailabilityDTO {
  id?: number;
  date: string;           // format YYYY-MM-DD
  startTime: string;      // format HH:mm
  endTime: string;        // format HH:mm
  isAvailable?: boolean;
  serviceId: number;
}

export interface ServiceAvailability {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  serviceId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {

  private readonly apiUrl = 'http://localhost:8087/elif/api/service-availability';

  constructor(private http: HttpClient) {}

  /**
   * Récupérer toutes les disponibilités
   */
  getAll(): Observable<ServiceAvailability[]> {
    return this.http.get<ServiceAvailability[]>(this.apiUrl);
  }

  /**
   * Récupérer les disponibilités d'un service spécifique (LA PLUS IMPORTANTE)
   */
  findByServiceId(serviceId: number): Observable<ServiceAvailability[]> {
    return this.http.get<ServiceAvailability[]>(`${this.apiUrl}/by-service/${serviceId}`);
  }

  /**
   * Récupérer une disponibilité par ID
   */
  getById(id: number): Observable<ServiceAvailability> {
    return this.http.get<ServiceAvailability>(`${this.apiUrl}/${id}`);
  }

  /**
   * Créer une nouvelle disponibilité
   */
  create(dto: ServiceAvailabilityDTO): Observable<ServiceAvailability> {
    return this.http.post<ServiceAvailability>(this.apiUrl, dto);
  }

  /**
   * Mettre à jour une disponibilité
   */
  update(id: number, dto: ServiceAvailabilityDTO): Observable<ServiceAvailability> {
    return this.http.put<ServiceAvailability>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Supprimer une disponibilité
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupérer uniquement les créneaux disponibles
   */
  findAvailableOnly(): Observable<ServiceAvailability[]> {
    return this.http.get<ServiceAvailability[]>(`${this.apiUrl}/available`);
  }

  /**
   * Récupérer les disponibilités par date
   */
  findByDate(date: string): Observable<ServiceAvailability[]> {
    return this.http.get<ServiceAvailability[]>(`${this.apiUrl}/by-date`, {
      params: { date }
    });
  }
}