import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';

interface DestinationExportFilters {
  [key: string]: string | undefined;
  status?: string;
  search?: string;
}

interface TravelPlanExportFilters {
  [key: string]: string | undefined;
  status?: string;
  search?: string;
  travelDate?: string;
}

interface FeedbackExportFilters {
  [key: string]: string | undefined;
  type?: string;
  status?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class TransitExportService {
  private readonly baseUrl = 'http://localhost:8087/elif/api/v1/transit/export';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  exportOverviewPdf(): Observable<void> {
    return this.download('/overview/pdf', 'transit-overview-summary.pdf');
  }

  exportOverviewExcel(): Observable<void> {
    return this.download('/overview/excel', 'transit-overview-summary.xlsx');
  }

  exportDestinationsPdf(filters: DestinationExportFilters): Observable<void> {
    return this.download('/destinations/pdf', 'transit-destinations.pdf', filters);
  }

  exportDestinationsExcel(filters: DestinationExportFilters): Observable<void> {
    return this.download('/destinations/excel', 'transit-destinations.xlsx', filters);
  }

  exportTravelPlansPdf(filters: TravelPlanExportFilters): Observable<void> {
    return this.download('/travel-plans/pdf', 'transit-travel-plans.pdf', filters);
  }

  exportTravelPlansExcel(filters: TravelPlanExportFilters): Observable<void> {
    return this.download('/travel-plans/excel', 'transit-travel-plans.xlsx', filters);
  }

  exportFeedbackPdf(filters: FeedbackExportFilters): Observable<void> {
    return this.download('/feedback/pdf', 'transit-feedback.pdf', filters);
  }

  exportFeedbackExcel(filters: FeedbackExportFilters): Observable<void> {
    return this.download('/feedback/excel', 'transit-feedback.xlsx', filters);
  }

  private download(
    endpoint: string,
    fallbackFileName: string,
    filters?: Record<string, string | undefined>
  ): Observable<void> {
    return this.withAdminHeaders((headers) =>
      this.http.get(`${this.baseUrl}${endpoint}`, {
        headers,
        params: this.buildParams(filters),
        observe: 'response',
        responseType: 'blob'
      })
    ).pipe(
      map((response) => {
        this.triggerDownload(response, fallbackFileName);
      })
    );
  }

  private withAdminHeaders<T>(requestFactory: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    const userId = this.resolveUserId();

    if (!userId) {
      return throwError(() => new Error('Admin session not found. Please sign in again.'));
    }

    return requestFactory(new HttpHeaders({ 'X-User-Id': userId }));
  }

  private resolveUserId(): string {
    const authUserId = this.authService.getCurrentUser()?.id;
    if (authUserId) {
      return String(authUserId);
    }

    const direct = String(localStorage.getItem('userId') ?? '').trim();
    if (direct) {
      return direct;
    }

    const rawSession = localStorage.getItem('elif_user');
    if (!rawSession) {
      return '';
    }

    try {
      const parsed = JSON.parse(rawSession) as { id?: unknown };
      const parsedId = Number(parsed?.id ?? 0);
      if (Number.isFinite(parsedId) && parsedId > 0) {
        const normalized = String(parsedId);
        localStorage.setItem('userId', normalized);
        return normalized;
      }
    } catch {
      return '';
    }

    return '';
  }

  private buildParams(filters?: Record<string, string | undefined>): HttpParams {
    let params = new HttpParams();
    if (!filters) {
      return params;
    }

    for (const [key, rawValue] of Object.entries(filters)) {
      const value = String(rawValue ?? '').trim();
      if (!value) {
        continue;
      }
      params = params.set(key, value);
    }

    return params;
  }

  private triggerDownload(response: HttpResponse<Blob>, fallbackFileName: string): void {
    const body = response.body;
    if (!body) {
      return;
    }

    const fileName = this.extractFileName(response.headers.get('content-disposition')) || fallbackFileName;

    const url = URL.createObjectURL(body);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private extractFileName(contentDisposition: string | null): string {
    if (!contentDisposition) {
      return '';
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]).replace(/\"/g, '').trim();
    }

    const simpleMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    return simpleMatch?.[1]?.trim() ?? '';
  }
}
