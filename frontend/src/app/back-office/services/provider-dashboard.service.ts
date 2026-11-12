import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PriorityItem {
  bookingId: number;
  description: string;
  level: 'URGENT' | 'NORMAL' | 'FAIBLE';
  reason: string;
}

export interface ProviderDashboard {
  summary: string;
  priorities: PriorityItem[];
  insights: string[];
  recommendations: string[];
}

@Injectable({ providedIn: 'root' })
export class ProviderDashboardService {
  private apiUrl = 'http://localhost:8087/elif/api/provider-dashboard/generate';

  constructor(private http: HttpClient) {}

  generate(providerId: number): Observable<ProviderDashboard> {
    return this.http.post<ProviderDashboard>(this.apiUrl, { providerId });
  }
}
