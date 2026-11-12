import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServiceCategory {
  id: number;
  name: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class ServiceCategoryService {
  private readonly apiUrl = 'http://localhost:8087/elif/api';

  constructor(private http: HttpClient) {}

  // Récupérer toutes les catégories
  findAll(): Observable<ServiceCategory[]> {
    return this.http.get<ServiceCategory[]>(`${this.apiUrl}/service-categories`);
  }

  // Récupérer une catégorie par ID
  findById(id: number): Observable<ServiceCategory> {
    return this.http.get<ServiceCategory>(`${this.apiUrl}/service-categories/${id}`);
  }

  // Créer une nouvelle catégorie
  create(category: Omit<ServiceCategory, 'id'>): Observable<ServiceCategory> {
    return this.http.post<ServiceCategory>(`${this.apiUrl}/service-categories`, category);
  }

  // Mettre à jour une catégorie
  update(id: number, category: Partial<ServiceCategory>): Observable<ServiceCategory> {
    return this.http.put<ServiceCategory>(`${this.apiUrl}/service-categories/${id}`, category);
  }

  // Supprimer une catégorie
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/service-categories/${id}`);
  }

  // Récupérer une catégorie par nom
  findByName(name: string): Observable<ServiceCategory> {
    return this.http.get<ServiceCategory>(`${this.apiUrl}/service-categories/by-name/${name}`);
  }
}