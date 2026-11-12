import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  DestinationType,
  TravelDestination,
  TravelDestinationSummary
} from '../models/travel-destination.model';

export interface TravelDestinationFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

interface PagePayload<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class TravelDestinationService {
  private readonly apiUrl = 'http://localhost:8087/elif/api/destinations';
  private readonly backendHost = 'http://localhost:8087';
  private readonly backendContext = '/elif';

  constructor(private readonly http: HttpClient) {}

  getPublishedDestinations(filters: TravelDestinationFilters = {}): Observable<TravelDestinationSummary[]> {
    return this.http.get<TravelDestinationSummary[] | PagePayload<TravelDestinationSummary>>(this.apiUrl, {
      params: this.toDestinationFiltersParams(filters)
    }).pipe(
      map((payload) =>
        this.extractContent(payload)
          .map((destination) => this.normalizeSummary(destination))
          .filter((destination) => destination.status === 'PUBLISHED')
      ),
      catchError(() =>
        throwError(() => new Error('Unable to load destinations at the moment. Please try again.'))
      )
    );
  }

  getDestinationById(id: number): Observable<TravelDestination> {
    return this.http.get<TravelDestination>(`${this.apiUrl}/${id}`).pipe(
      map((destination) => this.normalizeDestination(destination)),
      catchError(() =>
        throwError(() =>
          new Error('Unable to load destination details right now. Please try again shortly.')
        )
      )
    );
  }

  getDestinationsByType(type: DestinationType): Observable<TravelDestinationSummary[]> {
    return this.getPublishedDestinations().pipe(
      map((destinations) =>
        destinations.filter((destination) => destination.destinationType === type)
      )
    );
  }

  private normalizeSummary(destination: TravelDestinationSummary): TravelDestinationSummary {
    const normalizedCover = this.resolveImageUrl(this.extractCoverImageUrl(destination));

    return {
      ...destination,
      status: destination.status ?? 'PUBLISHED',
      coverImageUrl: normalizedCover
    };
  }

  private normalizeDestination(destination: TravelDestination): TravelDestination {
    const versionSeed = destination.updatedAt ?? destination.createdAt ?? destination.publishedAt ?? null;
    const normalizedCover = this.resolveImageUrl(this.extractCoverImageUrl(destination));

    return {
      ...destination,
      status: destination.status ?? 'PUBLISHED',
      region: destination.region ?? '',
      description: destination.description ?? '',
      safetyTips: destination.safetyTips ?? '',
      coverImageUrl: this.appendCacheBuster(normalizedCover, versionSeed),
      requiredDocuments: destination.requiredDocuments ?? [],
      carouselImages: (destination.carouselImages ?? [])
        .map((image, index) => {
          const rawImage = image as typeof image & { image_url?: string | null };
          const normalizedImageUrl = this.resolveImageUrl(rawImage.imageUrl ?? rawImage.image_url ?? '');

          return {
            ...image,
            displayOrder: image.displayOrder ?? index,
            imageUrl: this.appendCacheBuster(normalizedImageUrl, versionSeed)
          };
        })
        .filter((image) => image.imageUrl.length > 0)
        .sort((a, b) => a.displayOrder - b.displayOrder)
    };
  }

  private resolveImageUrl(imageUrl?: string): string {
    const normalized = (imageUrl ?? '').trim().replace(/\\/g, '/');
    if (!normalized) {
      return '';
    }

    if (
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('data:') ||
      normalized.startsWith('blob:')
    ) {
      return normalized;
    }

    if (normalized.startsWith('/uploads/')) {
      return `${this.backendHost}${this.backendContext}${normalized}`;
    }

    if (normalized.startsWith('uploads/')) {
      return `${this.backendHost}${this.backendContext}/${normalized}`;
    }

    if (normalized.startsWith('/elif/')) {
      return `${this.backendHost}${normalized}`;
    }

    if (normalized.startsWith('/')) {
      return `${this.backendHost}${normalized}`;
    }

    return normalized;
  }

  private appendCacheBuster(imageUrl: string, versionSeed: string | null | undefined): string {
    const normalizedUrl = (imageUrl ?? '').trim();
    const normalizedSeed = (versionSeed ?? '').trim();

    if (!normalizedUrl || !normalizedSeed) {
      return normalizedUrl;
    }

    if (
      normalizedUrl.startsWith('data:') ||
      normalizedUrl.startsWith('blob:') ||
      /[?&]v=/.test(normalizedUrl)
    ) {
      return normalizedUrl;
    }

    const separator = normalizedUrl.includes('?') ? '&' : '?';
    return `${normalizedUrl}${separator}v=${encodeURIComponent(normalizedSeed)}`;
  }

  private extractCoverImageUrl(
    destination: TravelDestination | TravelDestinationSummary
  ): string {
    const payload = destination as (TravelDestination | TravelDestinationSummary) & {
      cover_image_url?: string | null;
    };

    return payload.coverImageUrl ?? payload.cover_image_url ?? '';
  }

  private toDestinationFiltersParams(filters: TravelDestinationFilters): HttpParams {
    let params = new HttpParams();

    const search = String(filters.search ?? '').trim();
    if (search) {
      params = params.set('search', search);
    }

    const startDate = String(filters.startDate ?? '').trim();
    if (startDate) {
      params = params.set('startDate', startDate);
    }

    const endDate = String(filters.endDate ?? '').trim();
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    const page = Number(filters.page);
    if (Number.isFinite(page) && page >= 0) {
      params = params.set('page', String(page));
    }

    const size = Number(filters.size);
    if (Number.isFinite(size) && size > 0) {
      params = params.set('size', String(size));
    }

    return params;
  }

  private extractContent(
    payload: TravelDestinationSummary[] | PagePayload<TravelDestinationSummary>
  ): TravelDestinationSummary[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    return Array.isArray(payload?.content) ? payload.content : [];
  }
}
