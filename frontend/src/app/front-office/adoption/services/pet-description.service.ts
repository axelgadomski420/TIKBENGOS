import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DescriptionRequest {
  type: string;
  breed: string;
  age: number | null;
  personality: string;
  specialNeeds?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PetDescriptionService {
  private apiUrl = 'http://localhost:8087/elif/api/ai/pet-description';

  constructor(private http: HttpClient) {}

  generateDescription(request: DescriptionRequest): Observable<{ description: string }> {
    return this.http.post<{ description: string }>(`${this.apiUrl}/generate`, request);
  }
}