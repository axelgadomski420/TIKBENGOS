import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { TransitDashboardModel } from '../models/transit-dashboard.model';

@Injectable({ providedIn: 'root' })
export class TransitStatisticsService {

  private readonly apiUrl = 'http://localhost:8087/elif/api/v1/transit/statistics';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  /**
   * Fetches the Transit Overview statistics snapshot from the backend.
   * Uses the same X-User-Id header pattern as all other transit admin services.
   */
  getStatistics(): Observable<TransitDashboardModel> {
    const userId = this.authService.getCurrentUser()?.id;

    if (!userId) {
      return throwError(() => new Error('Admin session not found. Please sign in again.'));
    }

    const headers = new HttpHeaders({ 'X-User-Id': String(userId) });
    return this.http.get<TransitDashboardModel>(this.apiUrl, { headers });
  }
}
