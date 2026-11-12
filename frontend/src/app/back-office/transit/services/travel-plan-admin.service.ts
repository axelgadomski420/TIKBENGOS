import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import {
  ChecklistItemAdmin,
  ChecklistStats,
  TravelPlanStatus,
  TravelDocumentAdmin,
  TravelPlanDetail,
  TravelPlanSummary
} from '../models/travel-plan-admin.model';

export interface PetProfileAdmin {
  id: number;
  name: string;
  species: string;
  breed: string;
  weight: number;
  photoUrl?: string;
  gender: string;
}

export interface TravelPlanAdminFilters {
  status?: TravelPlanStatus;
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
export class TravelPlanAdminService {
  private readonly base = 'http://localhost:8087/elif';
  private readonly api = `${this.base}/api/travel-plans`;
  private readonly petsApi = `${this.base}/api/user-pets`;

  constructor(private readonly http: HttpClient) {}

  private withHeaders<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    const userId = this.resolveUserId();

    if (!userId) {
      return throwError(() => new Error('Admin session not found. Please sign in again.'));
    }

    return request(new HttpHeaders({ 'X-User-Id': userId }));
  }

  private resolveUserId(): string | null {
    const direct = String(localStorage.getItem('userId') ?? '').trim();
    if (direct) {
      return direct;
    }

    const rawSession = localStorage.getItem('elif_user');
    if (!rawSession) {
      return null;
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
      return null;
    }

    return null;
  }

  getAllPlans(filters: TravelPlanAdminFilters = {}): Observable<TravelPlanSummary[]> {
    return this.withHeaders((headers) =>
      this.http.get<TravelPlanSummary[] | PagePayload<TravelPlanSummary>>(`${this.api}/admin`, {
        headers,
        params: this.toPlanFiltersParams(filters)
      })
    ).pipe(map((payload) => this.normalizeSummaryList(this.extractContent(payload))));
  }

  getSubmittedPlans(): Observable<TravelPlanSummary[]> {
    return this.getAllPlans().pipe(map((plans) => plans.filter((plan) => plan.status === 'SUBMITTED')));
  }

  getPetById(petId: number): Observable<PetProfileAdmin> {
    const normalizedPetId = Number(petId);
    if (!Number.isFinite(normalizedPetId) || normalizedPetId <= 0) {
      return throwError(() => new Error('Invalid pet id.'));
    }

    return this.withHeaders((headers) =>
      this.http.get<PetProfileAdmin>(`${this.petsApi}/${normalizedPetId}`, { headers })
    ).pipe(
      map((pet) => this.normalizePet(pet)),
      catchError(() =>
        this.getAdminPets().pipe(
          map((pets) => pets.find((pet) => pet.id === normalizedPetId)),
          switchMap((pet) =>
            pet
              ? of(pet)
              : throwError(() => new Error(`Pet profile #${normalizedPetId} was not found.`))
          )
        )
      )
    );
  }

  getPetNamesByIds(petIds: number[]): Observable<Record<number, string>> {
    const uniqueIds = [...new Set((petIds ?? []).map((petId) => Number(petId)).filter((petId) => petId > 0))];
    if (uniqueIds.length === 0) {
      return of({});
    }

    return this.getAdminPets().pipe(
      map((pets) => {
        const byId = new Map<number, PetProfileAdmin>(pets.map((pet) => [pet.id, pet]));
        return uniqueIds.reduce<Record<number, string>>((accumulator, petId) => {
          const name = byId.get(petId)?.name?.trim();
          if (name) {
            accumulator[petId] = name;
          }
          return accumulator;
        }, {});
      })
    );
  }

  getPlanById(id: number): Observable<TravelPlanDetail> {
    return this.withHeaders((headers) =>
      this.http.get<TravelPlanDetail>(`${this.api}/admin/${id}`, { headers })
    ).pipe(map((plan) => this.normalizeDetail(plan)));
  }

  removeFromAdminView(id: number): Observable<void> {
    return this.withHeaders((headers) => this.http.delete<void>(`${this.api}/admin/${id}`, { headers }));
  }

  approvePlan(id: number, comment: string): Observable<TravelPlanDetail> {
    const params = this.commentAsParams(comment);

    return this.withHeaders((headers) =>
      this.http.post<TravelPlanDetail>(`${this.api}/${id}/approve`, null, { headers, params })
    ).pipe(map((plan) => this.normalizeDetail(plan)));
  }

  rejectPlan(id: number, comment: string): Observable<TravelPlanDetail> {
    const params = this.commentAsParams(comment);

    return this.withHeaders((headers) =>
      this.http.post<TravelPlanDetail>(`${this.api}/${id}/reject`, null, { headers, params })
    ).pipe(map((plan) => this.normalizeDetail(plan)));
  }

  getDocuments(planId: number): Observable<TravelDocumentAdmin[]> {
    return this.withHeaders((headers) =>
      this.http.get<TravelDocumentAdmin[]>(`${this.api}/${planId}/documents/admin`, { headers })
    ).pipe(map((documents) => this.normalizeDocuments(documents ?? [])));
  }

  getChecklist(planId: number): Observable<ChecklistItemAdmin[]> {
    return this.withHeaders((headers) =>
      this.http.get<ChecklistItemAdmin[]>(`${this.api}/${planId}/checklist`, { headers })
    ).pipe(
      map((items) =>
        (items ?? []).map((item) => ({
          ...item,
          id: Number(item.id ?? 0),
          travelPlanId: Number(item.travelPlanId ?? planId),
          title: String(item.title ?? ''),
          description: item.description ? String(item.description) : undefined,
          mandatory: Boolean(item.mandatory),
          completed: Boolean(item.completed)
        }))
      )
    );
  }

  getChecklistStats(planId: number): Observable<ChecklistStats> {
    return this.withHeaders((headers) =>
      this.http.get<ChecklistStats>(`${this.api}/${planId}/checklist/stats`, { headers })
    ).pipe(map((stats) => this.normalizeChecklistStats(stats)));
  }

  validateDocument(planId: number, docId: number, comment: string): Observable<TravelDocumentAdmin> {
    const payload = {
      validationStatus: 'VALID',
      validationComment: comment.trim() || null
    };

    return this.withHeaders((headers) =>
      this.http.post<TravelDocumentAdmin>(`${this.api}/${planId}/documents/${docId}/validate`, payload, { headers })
    ).pipe(map((document) => this.normalizeDocument(document)));
  }

  rejectDocument(planId: number, docId: number, comment: string): Observable<TravelDocumentAdmin> {
    const params = this.commentAsParams(comment);

    return this.withHeaders((headers) =>
      this.http.post<TravelDocumentAdmin>(`${this.api}/${planId}/documents/${docId}/reject`, null, {
        headers,
        params
      })
    ).pipe(map((document) => this.normalizeDocument(document)));
  }

  getAbsoluteDocumentUrl(fileUrl: string): string {
    const normalized = String(fileUrl ?? '').trim();
    if (!normalized) {
      return '';
    }

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    return `${this.base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  }

  private commentAsParams(comment: string): HttpParams {
    const normalized = String(comment ?? '').trim();
    if (!normalized) {
      return new HttpParams();
    }

    return new HttpParams().set('comment', normalized);
  }

  private normalizeSummaryList(plans: TravelPlanSummary[]): TravelPlanSummary[] {
    return plans.map((plan) => this.normalizeSummary(plan));
  }

  private normalizeSummary(plan: TravelPlanSummary): TravelPlanSummary {
    return {
      id: Number(plan.id ?? 0),
      ownerId: Number(plan.ownerId ?? 0),
      ownerName: String(plan.ownerName ?? 'Unknown Client'),
      petId: Number(plan.petId ?? 0),
      petName: this.toOptionalText(plan.petName),
      destinationId: Number(plan.destinationId ?? 0),
      destinationTitle: String(plan.destinationTitle ?? 'Untitled Destination'),
      destinationCountry: String(plan.destinationCountry ?? 'Unknown Country'),
      origin: String(plan.origin ?? '-'),
      transportType: String(plan.transportType ?? 'CAR'),
      travelDate: String(plan.travelDate ?? ''),
      returnDate: plan.returnDate ? String(plan.returnDate) : undefined,
      readinessScore: this.toScore(plan.readinessScore),
      safetyStatus: String(plan.safetyStatus ?? 'PENDING').toUpperCase() as TravelPlanSummary['safetyStatus'],
      status: String(plan.status ?? 'DRAFT').toUpperCase() as TravelPlanSummary['status'],
      hasFeedback: Boolean((plan as TravelPlanSummary & { hasFeedback?: boolean }).hasFeedback),
      submittedAt: plan.submittedAt ? String(plan.submittedAt) : undefined,
      createdAt: String(plan.createdAt ?? '')
    };
  }

  private normalizeDetail(plan: TravelPlanDetail): TravelPlanDetail {
    const base = this.normalizeSummary(plan);

    return {
      ...base,
      estimatedTravelHours: this.toOptionalNumber(plan.estimatedTravelHours),
      estimatedTravelCost: this.toOptionalNumber(plan.estimatedTravelCost),
      currency: plan.currency ? String(plan.currency) : undefined,
      animalWeight: this.toOptionalNumber(plan.animalWeight),
      cageLength: this.toOptionalNumber(plan.cageLength),
      cageWidth: this.toOptionalNumber(plan.cageWidth),
      cageHeight: this.toOptionalNumber(plan.cageHeight),
      hydrationIntervalMinutes: this.toOptionalNumber(plan.hydrationIntervalMinutes),
      adminDecisionComment: plan.adminDecisionComment ? String(plan.adminDecisionComment) : undefined,
      reviewedByAdminName: plan.reviewedByAdminName ? String(plan.reviewedByAdminName) : undefined,
      reviewedAt: plan.reviewedAt ? String(plan.reviewedAt) : undefined
    };
  }

  private normalizeDocuments(documents: TravelDocumentAdmin[]): TravelDocumentAdmin[] {
    return documents
      .map((document) => this.normalizeDocument(document))
      .sort((left, right) => this.toTimestamp(right.uploadedAt) - this.toTimestamp(left.uploadedAt));
  }

  private normalizeDocument(document: TravelDocumentAdmin): TravelDocumentAdmin {
    return {
      id: Number(document.id ?? 0),
      travelPlanId: Number(document.travelPlanId ?? 0),
      documentType: String(document.documentType ?? 'UNKNOWN'),
      fileUrl: String(document.fileUrl ?? ''),
      documentNumber: document.documentNumber ? String(document.documentNumber) : undefined,
      holderName: document.holderName ? String(document.holderName) : undefined,
      issueDate: document.issueDate ? String(document.issueDate) : undefined,
      expiryDate: document.expiryDate ? String(document.expiryDate) : undefined,
      issuingOrganization: document.issuingOrganization ? String(document.issuingOrganization) : undefined,
      isOcrProcessed: Boolean(document.isOcrProcessed),
      validationStatus: String(document.validationStatus ?? 'PENDING').toUpperCase() as TravelDocumentAdmin['validationStatus'],
      validationComment: document.validationComment ? String(document.validationComment) : undefined,
      uploadedAt: String(document.uploadedAt ?? ''),
      validatedAt: document.validatedAt ? String(document.validatedAt) : undefined,
      validatedByAdminName: document.validatedByAdminName ? String(document.validatedByAdminName) : undefined
    };
  }

  private normalizeChecklistStats(stats: ChecklistStats): ChecklistStats {
    return {
      totalItems: Number(stats?.totalItems ?? 0),
      completedItems: Number(stats?.completedItems ?? 0),
      totalMandatory: Number(stats?.totalMandatory ?? 0),
      completedMandatory: Number(stats?.completedMandatory ?? 0),
      completionPercentage: this.toScore(stats?.completionPercentage),
      mandatoryCompletionPercentage: this.toScore(stats?.mandatoryCompletionPercentage)
    };
  }

  private getAdminPets(): Observable<PetProfileAdmin[]> {
    return this.withHeaders((headers) =>
      this.http.get<PetProfileAdmin[]>(`${this.petsApi}/admin`, { headers })
    ).pipe(
      map((pets) => (pets ?? []).map((pet) => this.normalizePet(pet)))
    );
  }

  private normalizePet(pet: PetProfileAdmin): PetProfileAdmin {
    return {
      id: Number(pet?.id ?? 0),
      name: String(pet?.name ?? '').trim() || 'Unnamed Pet',
      species: String(pet?.species ?? '').trim() || 'UNKNOWN',
      breed: String(pet?.breed ?? '').trim() || 'Unknown breed',
      weight: Number(pet?.weight ?? 0),
      photoUrl: this.toOptionalText(pet?.photoUrl),
      gender: String(pet?.gender ?? '').trim() || 'Unknown'
    };
  }

  private toOptionalNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toOptionalText(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private toScore(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.min(100, parsed));
  }

  private toTimestamp(value: string): number {
    const parsed = Date.parse(String(value ?? ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private toPlanFiltersParams(filters: TravelPlanAdminFilters): HttpParams {
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

  private extractContent(
    payload: TravelPlanSummary[] | PagePayload<TravelPlanSummary>
  ): TravelPlanSummary[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    return Array.isArray(payload?.content) ? payload.content : [];
  }
}
