import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  AdminPetBulkDeletePayload,
  AdminPetBulkOperationResult,
  AdminPetBulkUpdatePayload,
  AdminPetDashboardStats,
  PetCareTask,
  PetCareTaskPayload,
  PetFeedingLog,
  PetFeedingLogPayload,
  PetHealthRecord,
  PetHealthRecordPayload,
  PetNutritionInsights,
  PetNutritionProfile,
  PetNutritionProfilePayload,
  PetNutritionSummary,
  PetPhotoProfileAnalysis,
  PetProfile,
  PetProfilePayload,
  PetSpecies
} from '../models/pet-profile.model';

@Injectable({ providedIn: 'root' })
export class PetProfileService {
  private readonly api = 'http://localhost:8087/elif/api/user-pets';
  private readonly backendHost = 'http://localhost:8087';
  private readonly backendContext = '/elif';

  constructor(private http: HttpClient) {}

  private headers(userId: number): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ 'X-User-Id': String(userId) }) };
  }

  getMyPets(userId: number, species?: PetSpecies): Observable<PetProfile[]> {
    let params = new HttpParams();
    if (species) {
      params = params.set('species', species);
    }
    return this.http.get<PetProfile[]>(this.api, { ...this.headers(userId), params }).pipe(
      map((pets) => (pets ?? []).map((pet) => this.normalizePet(pet)))
    );
  }

  getMyPetById(userId: number, petId: number): Observable<PetProfile> {
    return this.http.get<PetProfile>(`${this.api}/${petId}`, this.headers(userId)).pipe(
      map((pet) => this.normalizePet(pet))
    );
  }

  createMyPet(userId: number, payload: PetProfilePayload): Observable<PetProfile> {
    return this.http.post<PetProfile>(this.api, payload, this.headers(userId)).pipe(
      map((pet) => this.normalizePet(pet))
    );
  }

  updateMyPet(userId: number, petId: number, payload: PetProfilePayload): Observable<PetProfile> {
    return this.http.put<PetProfile>(`${this.api}/${petId}`, payload, this.headers(userId)).pipe(
      map((pet) => this.normalizePet(pet))
    );
  }

  updateMyPetLocation(userId: number, petId: number, latitude: number, longitude: number): Observable<PetProfile> {
    return this.http.put<PetProfile>(`${this.api}/${petId}/location`, { latitude, longitude }, this.headers(userId)).pipe(
      map((pet) => this.normalizePet(pet))
    );
  }

  uploadMyPetPhoto(userId: number, petId: number, file: File): Observable<PetProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PetProfile>(`${this.api}/${petId}/photo`, formData, this.headers(userId)).pipe(
      map((pet) => this.normalizePet(pet))
    );
  }

  analyzePetPhotoForProfile(userId: number, file: File): Observable<PetPhotoProfileAnalysis> {
    const formData = new FormData();
    formData.append('file', file);

    const primaryUrl = `${this.api}/ai/profile-from-photo`;
    const legacyUrl = `${this.api}/ai-profile-from-photo`;

    return this.http.post<PetPhotoProfileAnalysis>(primaryUrl, formData, this.headers(userId)).pipe(
      catchError((err: { status?: number }) => {
        const status = err?.status ?? 0;
        if (status !== 404 && status !== 405) {
          return throwError(() => err);
        }
        return this.http.post<PetPhotoProfileAnalysis>(legacyUrl, formData, this.headers(userId));
      })
    );
  }

  analyzeForWizard(userId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.api}/ai/wizard-analysis`, formData, this.headers(userId));
  }

  deleteMyPet(userId: number, petId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${petId}`, this.headers(userId));
  }

  getMyPetHealthHistory(userId: number, petId: number): Observable<PetHealthRecord[]> {
    return this.http.get<PetHealthRecord[]>(`${this.api}/${petId}/health-history`, this.headers(userId));
  }

  createMyPetHealthRecord(userId: number, petId: number, payload: PetHealthRecordPayload): Observable<PetHealthRecord> {
    return this.http.post<PetHealthRecord>(`${this.api}/${petId}/health-history`, payload, this.headers(userId));
  }

  updateMyPetHealthRecord(
    userId: number,
    petId: number,
    recordId: number,
    payload: PetHealthRecordPayload
  ): Observable<PetHealthRecord> {
    return this.http.put<PetHealthRecord>(`${this.api}/${petId}/health-history/${recordId}`, payload, this.headers(userId));
  }

  deleteMyPetHealthRecord(userId: number, petId: number, recordId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${petId}/health-history/${recordId}`, this.headers(userId));
  }

  getMyPetTasks(userId: number, petId: number): Observable<PetCareTask[]> {
    return this.http.get<PetCareTask[]>(`${this.api}/${petId}/tasks`, this.headers(userId));
  }

  createMyPetTask(userId: number, petId: number, payload: PetCareTaskPayload): Observable<PetCareTask> {
    return this.http.post<PetCareTask>(`${this.api}/${petId}/tasks`, payload, this.headers(userId));
  }

  updateMyPetTask(userId: number, petId: number, taskId: number, payload: PetCareTaskPayload): Observable<PetCareTask> {
    return this.http.put<PetCareTask>(`${this.api}/${petId}/tasks/${taskId}`, payload, this.headers(userId));
  }

  deleteMyPetTask(userId: number, petId: number, taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${petId}/tasks/${taskId}`, this.headers(userId));
  }

  getMyPetNutritionProfile(userId: number, petId: number): Observable<PetNutritionProfile> {
    return this.http.get<PetNutritionProfile>(`${this.api}/${petId}/nutrition-profile`, this.headers(userId));
  }

  upsertMyPetNutritionProfile(
    userId: number,
    petId: number,
    payload: PetNutritionProfilePayload
  ): Observable<PetNutritionProfile> {
    return this.http.put<PetNutritionProfile>(`${this.api}/${petId}/nutrition-profile`, payload, this.headers(userId));
  }

  getMyPetFeedingLogs(userId: number, petId: number, fromDate?: string, toDate?: string): Observable<PetFeedingLog[]> {
    let params = new HttpParams();
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }
    return this.http.get<PetFeedingLog[]>(`${this.api}/${petId}/feeding-logs`, { ...this.headers(userId), params });
  }

  createMyPetFeedingLog(userId: number, petId: number, payload: PetFeedingLogPayload): Observable<PetFeedingLog> {
    return this.http.post<PetFeedingLog>(`${this.api}/${petId}/feeding-logs`, payload, this.headers(userId));
  }

  updateMyPetFeedingLog(
    userId: number,
    petId: number,
    logId: number,
    payload: PetFeedingLogPayload
  ): Observable<PetFeedingLog> {
    return this.http.put<PetFeedingLog>(`${this.api}/${petId}/feeding-logs/${logId}`, payload, this.headers(userId));
  }

  deleteMyPetFeedingLog(userId: number, petId: number, logId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${petId}/feeding-logs/${logId}`, this.headers(userId));
  }

  getMyPetNutritionSummary(userId: number, petId: number): Observable<PetNutritionSummary> {
    return this.http.get<PetNutritionSummary>(`${this.api}/${petId}/nutrition-summary`, this.headers(userId));
  }

  getMyPetNutritionInsights(userId: number, petId: number, days = 14): Observable<PetNutritionInsights> {
    const params = new HttpParams().set('days', String(days));
    return this.http.get<PetNutritionInsights>(`${this.api}/${petId}/nutrition-insights`, {
      ...this.headers(userId),
      params
    });
  }

  getAllPetsForAdmin(userId: number, species?: PetSpecies): Observable<PetProfile[]> {
    let params = new HttpParams();
    if (species) {
      params = params.set('species', species);
    }
    return this.http.get<PetProfile[]>(`${this.api}/admin`, { ...this.headers(userId), params }).pipe(
      map((pets) => (pets ?? []).map((pet) => this.normalizePet(pet)))
    );
  }

  updatePetAsAdmin(userId: number, petId: number, payload: PetProfilePayload): Observable<PetProfile> {
    return this.http.put<PetProfile>(`${this.api}/admin/${petId}`, payload, this.headers(userId)).pipe(
      map((pet) => this.normalizePet(pet))
    );
  }

  uploadPetPhotoAsAdmin(userId: number, petId: number, file: File): Observable<PetProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PetProfile>(`${this.api}/admin/${petId}/photo`, formData, this.headers(userId)).pipe(
      map((pet) => this.normalizePet(pet))
    );
  }

  deletePetAsAdmin(userId: number, petId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/admin/${petId}`, this.headers(userId));
  }

  getAdminPetStats(userId: number): Observable<AdminPetDashboardStats> {
    return this.http.get<AdminPetDashboardStats>(`${this.api}/admin/stats`, this.headers(userId));
  }

  bulkUpdatePetsAsAdmin(userId: number, payload: AdminPetBulkUpdatePayload): Observable<AdminPetBulkOperationResult> {
    return this.http.post<AdminPetBulkOperationResult>(`${this.api}/admin/bulk-update`, payload, this.headers(userId));
  }

  bulkDeletePetsAsAdmin(userId: number, payload: AdminPetBulkDeletePayload): Observable<AdminPetBulkOperationResult> {
    return this.http.post<AdminPetBulkOperationResult>(`${this.api}/admin/bulk-delete`, payload, this.headers(userId));
  }

  private normalizePet(pet: PetProfile): PetProfile {
    return {
      ...pet,
      photoUrl: this.resolveImageUrl(pet.photoUrl)
    };
  }

  private resolveImageUrl(imageUrl?: string | null): string | null {
    const normalized = (imageUrl ?? '').trim();
    if (!normalized) {
      return null;
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
}
