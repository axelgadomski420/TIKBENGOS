// src/app/front-office/events/services/category.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventCategory } from '../models/event.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl = 'http://localhost:8087/elif/api/event-categories';

  constructor(private http: HttpClient) {}

  getAllCategories(): Observable<EventCategory[]> {
    return this.http.get<EventCategory[]>(this.apiUrl);
  }

  getCategoryById(id: number): Observable<EventCategory> {
    return this.http.get<EventCategory>(`${this.apiUrl}/${id}`);
  }
}