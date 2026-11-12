import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Shelter } from '../models/shelter.model';

@Injectable({
  providedIn: 'root'
})
export class ShelterService {
  private apiUrl = 'http://localhost:8087/elif/api/adoption/shelters';

  constructor(private http: HttpClient) {}

  // Méthodes existantes
  getAll(): Observable<Shelter[]> {
    return this.http.get<Shelter[]>(this.apiUrl);
  }

  getById(id: number): Observable<Shelter> {
    return this.http.get<Shelter>(`${this.apiUrl}/${id}`);
  }

  getVerified(): Observable<Shelter[]> {
    return this.http.get<Shelter[]>(`${this.apiUrl}/verified`);
  }

  search(keyword: string): Observable<Shelter[]> {
    return this.http.get<Shelter[]>(`${this.apiUrl}/search?keyword=${keyword}`);
  }

  // NOUVELLE MÉTHODE - AJOUTER SANS SUPPRIMER LES AUTRES
  getShelterByUserId(userId: number): Observable<Shelter> {
    return this.http.get<Shelter>(`${this.apiUrl}/user/${userId}`);
  }
}