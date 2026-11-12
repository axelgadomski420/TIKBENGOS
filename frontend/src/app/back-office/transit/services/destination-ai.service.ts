import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';

export interface AiGenerationRequest {
  target: 'DESCRIPTION' | 'SAFETY_TIPS' | 'BOTH';
  title?: string;
  country?: string;
  region?: string;
  destinationType?: string;
  transport?: string;
  petFriendlyLevel?: number;
}

export interface AiGenerationResponse {
  description?: string;
  safetyTips?: string;
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class DestinationAiService {
  private readonly generateApi = 'http://localhost:8087/elif/api/admin/transit/destinations/generate-content';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  generateContent(request: AiGenerationRequest): Observable<AiGenerationResponse> {
    return this.withAdminHeaders((headers) =>
      this.http.post<AiGenerationResponse>(this.generateApi, request, { headers })
    );
  }

  private withAdminHeaders<T>(requestFactory: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    const currentUserId = this.authService.getCurrentUser()?.id;

    if (!currentUserId) {
      return throwError(() => new Error('Admin session not found. Please sign in again.'));
    }

    const headers = new HttpHeaders({ 'X-User-Id': String(currentUserId) });
    return requestFactory(headers);
  }
}
