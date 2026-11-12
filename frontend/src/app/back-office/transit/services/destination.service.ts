import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import {
  Destination,
  DestinationCarouselImage,
  DestinationCreateRequest,
  DestinationUpdateRequest,
  DestinationStatus,
  DestinationType,
  DocumentType,
  TransportType
} from '../models/destination.model';

export interface DestinationAdminFilters {
  status?: DestinationStatus;
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
export class DestinationService {
  private readonly baseApi = 'http://localhost:8087/elif/api/destinations';
  private readonly backendHost = 'http://localhost:8087';
  private readonly backendContext = '/elif';

  readonly destinationTypes: DestinationType[] = [
    'BEACH',
    'MOUNTAIN',
    'CITY',
    'FOREST',
    'ROAD_TRIP',
    'INTERNATIONAL'
  ];

  readonly transportTypes: TransportType[] = ['CAR', 'TRAIN', 'PLANE', 'BUS'];

  readonly documentTypes: DocumentType[] = [
    'PET_PASSPORT',
    'RABIES_VACCINE',
    'HEALTH_CERTIFICATE',
    'TRANSPORT_AUTHORIZATION'
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  getAdminDestinations(filters: DestinationAdminFilters = {}): Observable<Destination[]> {
    return this.withAdminHeaders((headers) =>
      this.http.get<Destination[] | PagePayload<Destination>>(`${this.baseApi}/admin/all`, {
        headers,
        params: this.toAdminFiltersParams(filters)
      })
    ).pipe(
      map((payload) =>
        this.extractContent(payload)
          .map((destination) => this.normalizeDestination(destination))
          .sort((first, second) => (second.createdAt ?? '').localeCompare(first.createdAt ?? ''))
      )
    );
  }

  getDestinationById(destinationId: number): Observable<Destination> {
    return this.withAdminHeaders((headers) =>
      this.http.get<Destination>(`${this.baseApi}/admin/${destinationId}`, { headers })
    ).pipe(map((destination) => this.normalizeDestination(destination)));
  }

  createDestination(
    payload: DestinationCreateRequest,
    coverImageFile?: File | null,
    carouselImageFiles?: File[] | null
  ): Observable<Destination> {
    const formData = this.buildDestinationMultipartPayload(
      payload,
      coverImageFile,
      carouselImageFiles
    );

    return this.withAdminHeaders((headers) =>
      this.http.post<Destination>(`${this.baseApi}`, formData, { headers })
    ).pipe(map((destination) => this.normalizeDestination(destination)));
  }

  updateDestination(
    destinationId: number,
    payload: DestinationUpdateRequest,
    coverImageFile?: File | null,
    carouselImageFiles?: File[] | null
  ): Observable<Destination> {
    const formData = this.buildDestinationMultipartPayload(
      payload,
      coverImageFile,
      carouselImageFiles
    );

    return this.withAdminHeaders((headers) =>
      this.http.put<Destination>(`${this.baseApi}/${destinationId}`, formData, { headers })
    ).pipe(map((destination) => this.normalizeDestination(destination)));
  }

  deleteDestination(destinationId: number): Observable<void> {
    return this.withAdminHeaders((headers) =>
      this.http.delete<void>(`${this.baseApi}/${destinationId}`, { headers })
    );
  }

  deleteCarouselImage(imageId: number): Observable<void> {
    return this.withAdminHeaders((headers) =>
      this.http.delete<void>(`${this.baseApi}/images/${imageId}`, { headers })
    );
  }

  archiveDestination(destinationId: number): Observable<Destination> {
    return this.withAdminHeaders((headers) =>
      this.http.post<Destination>(`${this.baseApi}/${destinationId}/archive`, null, { headers })
    ).pipe(map((destination) => this.normalizeDestination(destination)));
  }

  unarchiveDestination(destinationId: number): Observable<Destination> {
    return this.withAdminHeaders((headers) =>
      this.http.post<Destination>(`${this.baseApi}/${destinationId}/unarchive`, null, { headers })
    ).pipe(
      map((destination) => this.normalizeDestination(destination)),
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          (error.status === 404 || error.status === 405 || error.status === 501)
        ) {
          return this.publishDestination(destinationId);
        }
        return throwError(() => error);
      })
    );
  }

  moveDestinationToDraft(destinationId: number): Observable<Destination> {
    return this.withAdminHeaders((headers) =>
      this.http.post<Destination>(`${this.baseApi}/${destinationId}/draft`, null, { headers })
    ).pipe(
      map((destination) => this.normalizeDestination(destination)),
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          (error.status === 404 || error.status === 405 || error.status === 501)
        ) {
          return throwError(
            () => new Error('Move to draft is not supported by the current backend API.')
          );
        }
        return throwError(() => error);
      })
    );
  }

  publishDestination(destinationId: number): Observable<Destination> {
    return this.withAdminHeaders((headers) =>
      this.http.post<Destination>(`${this.baseApi}/${destinationId}/publish`, null, { headers })
    ).pipe(map((destination) => this.normalizeDestination(destination)));
  }

  scheduleDestination(destinationId: number, scheduledAt: string): Observable<Destination> {
    const params = new HttpParams().set('scheduledAt', this.toIsoLocalDateTime(scheduledAt));

    return this.withAdminHeaders((headers) =>
      this.http.post<Destination>(`${this.baseApi}/${destinationId}/schedule`, null, {
        headers,
        params
      })
    ).pipe(map((destination) => this.normalizeDestination(destination)));
  }

  formatDestinationType(type: DestinationType): string {
    switch (type) {
      case 'ROAD_TRIP':
        return 'Road Trip';
      default:
        return this.titleCase(type);
    }
  }

  formatTransportType(type: TransportType): string {
    return this.titleCase(type);
  }

  formatDocumentType(documentType: DocumentType): string {
    switch (documentType) {
      case 'PET_PASSPORT':
        return 'Pet Passport';
      case 'RABIES_VACCINE':
        return 'Rabies Vaccine';
      case 'HEALTH_CERTIFICATE':
        return 'Health Certificate';
      case 'TRANSPORT_AUTHORIZATION':
        return 'Transport Authorization';
      default:
        return this.titleCase(documentType);
    }
  }

  formatDocumentShort(documentType: DocumentType): string {
    switch (documentType) {
      case 'PET_PASSPORT':
        return 'Passport';
      case 'RABIES_VACCINE':
        return 'Vaccine';
      case 'HEALTH_CERTIFICATE':
        return 'Health Cert.';
      case 'TRANSPORT_AUTHORIZATION':
        return 'Authorization';
      default:
        return this.titleCase(documentType);
    }
  }

  resolveCoverImageUrl(coverImageUrl: string | null | undefined): string {
    const normalizedUrl = (coverImageUrl ?? '').trim().replace(/\\/g, '/');
    if (!normalizedUrl) {
      return '';
    }

    if (
      normalizedUrl.startsWith('http://') ||
      normalizedUrl.startsWith('https://') ||
      normalizedUrl.startsWith('data:') ||
      normalizedUrl.startsWith('blob:')
    ) {
      return normalizedUrl;
    }

    if (normalizedUrl.startsWith('/uploads/')) {
      return `${this.backendHost}${this.backendContext}${normalizedUrl}`;
    }

    if (normalizedUrl.startsWith('uploads/')) {
      return `${this.backendHost}${this.backendContext}/${normalizedUrl}`;
    }

    if (normalizedUrl.startsWith('/elif/')) {
      return `${this.backendHost}${normalizedUrl}`;
    }

    if (normalizedUrl.startsWith('/')) {
      return `${this.backendHost}${normalizedUrl}`;
    }

    return normalizedUrl;
  }

  resolveDestinationImageUrl(imageUrl: string | null | undefined): string {
    return this.resolveCoverImageUrl(imageUrl);
  }

  appendCacheBuster(imageUrl: string, versionSeed: string | null | undefined): string {
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

  private withAdminHeaders<T>(
    requestFactory: (headers: HttpHeaders) => Observable<T>
  ): Observable<T> {
    const currentUserId = this.authService.getCurrentUser()?.id;

    if (!currentUserId) {
      return throwError(() => new Error('Admin session not found. Please sign in again.'));
    }

    const headers = new HttpHeaders({ 'X-User-Id': String(currentUserId) });
    return requestFactory(headers);
  }

  private normalizeDestination(destination: Destination): Destination {
    const safeStatus: DestinationStatus = destination.status ?? 'DRAFT';
    const normalizedCoverImageUrl = this.extractCoverImageUrl(destination);

    return {
      ...destination,
      status: safeStatus,
      coverImageUrl: normalizedCoverImageUrl,
      carouselImages: this.normalizeCarouselImages(destination.carouselImages),
      requiredDocuments: (destination.requiredDocuments ?? []) as DocumentType[],
      linkedPlansCount: Number((destination as Destination & { linkedPlansCount?: number }).linkedPlansCount ?? 0),
      scheduledPublishAt:
        destination.scheduledPublishAt ??
        destination.scheduledDate ??
        (destination as Destination & { scheduledAt?: string | null }).scheduledAt ??
        null,
      publishedAt: destination.publishedAt ?? null
    };
  }

  private buildDestinationMultipartPayload(
    payload: DestinationCreateRequest | DestinationUpdateRequest,
    coverImageFile?: File | null,
    carouselImageFiles?: File[] | null
  ): FormData {
    const formData = new FormData();
    const requestPayload = this.toBackendPayload(payload);
    const requestBlob = new Blob([JSON.stringify(requestPayload)], { type: 'application/json' });

    formData.append('request', requestBlob);

    if (coverImageFile) {
      formData.append('coverImageFile', coverImageFile, coverImageFile.name);
    }

    if (carouselImageFiles && carouselImageFiles.length > 0) {
      for (const carouselImageFile of carouselImageFiles) {
        formData.append('carouselImages', carouselImageFile, carouselImageFile.name);
      }
    }

    return formData;
  }

  private normalizeCarouselImages(
    carouselImages: DestinationCarouselImage[] | null | undefined
  ): DestinationCarouselImage[] {
    if (!carouselImages || carouselImages.length === 0) {
      return [];
    }

    return carouselImages
      .map((image, index) => {
        const rawImage = image as DestinationCarouselImage & { image_url?: string | null };
        const resolvedImageUrl = rawImage.imageUrl ?? rawImage.image_url ?? '';

        return {
          id: image.id,
          imageUrl: resolvedImageUrl,
          displayOrder: image.displayOrder ?? index
        };
      })
      .filter((image) => Boolean(image.imageUrl));
  }

  private toIsoLocalDateTime(dateTimeValue: string): string {
    if (dateTimeValue.length === 16) {
      return `${dateTimeValue}:00`;
    }
    return dateTimeValue;
  }

  private toAdminFiltersParams(filters: DestinationAdminFilters): HttpParams {
    let params = new HttpParams();

    const status = String(filters.status ?? '').trim();
    if (status) {
      params = params.set('status', status);
    }

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

  private titleCase(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractCoverImageUrl(destination: Destination): string {
    const payload = destination as Destination & { cover_image_url?: string | null };
    return payload.coverImageUrl ?? payload.cover_image_url ?? '';
  }

  private toBackendPayload(
    payload: DestinationCreateRequest | DestinationUpdateRequest
  ): Record<string, unknown> {
    const requestPayload: Record<string, unknown> = { ...payload };
    const coverImageUrl = payload.coverImageUrl;

    if (coverImageUrl !== undefined) {
      requestPayload['cover_image_url'] = coverImageUrl;
    }

    if ('replaceCarouselImages' in payload) {
      requestPayload['replace_carousel_images'] =
        (payload as DestinationUpdateRequest).replaceCarouselImages ?? false;
    }

    return requestPayload;
  }

  private extractContent(payload: Destination[] | PagePayload<Destination>): Destination[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    return Array.isArray(payload?.content) ? payload.content : [];
  }
}


