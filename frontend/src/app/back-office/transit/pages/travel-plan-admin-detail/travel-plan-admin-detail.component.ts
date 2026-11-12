import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { TransitToastContainerComponent } from '../../components/transit-toast-container/transit-toast-container.component';
import { TransitToastService } from '../../services/transit-toast.service';
import {
  ChecklistStats,
  DocumentValidationStatus,
  TravelDocumentAdmin,
  TravelPlanDetail,
  TravelPlanStatus
} from '../../models/travel-plan-admin.model';
import { TravelPlanAdminService } from '../../services/travel-plan-admin.service';

type DocumentActionMode = 'validate' | 'reject';

interface Pet {
  id: number;
  name: string;
  species: string;
  breed: string;
  weight: number;
  photoUrl?: string;
  gender: string;
}

@Component({
  selector: 'app-travel-plan-admin-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, TransitToastContainerComponent],
  templateUrl: './travel-plan-admin-detail.component.html',
  styleUrl: './travel-plan-admin-detail.component.scss'
})
export class TravelPlanAdminDetailComponent implements OnInit {
  private readonly backendBaseUrl = 'http://localhost:8087/elif';

  planId = 0;

  planLoading = true;
  petLoading = false;
  documentsLoading = true;
  checklistLoading = true;
  pageError = '';

  plan: TravelPlanDetail | null = null;
  petProfile: Pet | null = null;
  documents: TravelDocumentAdmin[] = [];
  checklistStats: ChecklistStats | null = null;

  decisionCommentControl = new FormControl<string>('', { nonNullable: true });
  decisionSubmitting = false;

  docActionPanel: { docId: number; mode: DocumentActionMode } | null = null;
  docActionCommentControl = new FormControl<string>('', { nonNullable: true });
  docActionSubmitting = false;
  showRejectDocDialog = false;
  docToReject: any = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly travelPlanAdminService: TravelPlanAdminService,
    private readonly transitToastService: TransitToastService
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    const parsedId = Number(rawId);

    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      this.pageError = 'Invalid travel plan id.';
      this.planLoading = false;
      this.documentsLoading = false;
      this.checklistLoading = false;
      return;
    }

    this.planId = parsedId;
    this.loadAll();
  }

  get pageReady(): boolean {
    return !this.planLoading && !this.pageError && !!this.plan;
  }

  get checklistCompletion(): number {
    return Math.max(0, Math.min(100, this.checklistStats?.completionPercentage ?? 0));
  }

  get checklistMandatoryCompletion(): number {
    return Math.max(0, Math.min(100, this.checklistStats?.mandatoryCompletionPercentage ?? 0));
  }

  get checklistRemaining(): number {
    if (!this.checklistStats) {
      return 0;
    }

    return Math.max(0, this.checklistStats.totalItems - this.checklistStats.completedItems);
  }

  get checklistMandatoryLeft(): number {
    if (!this.checklistStats) {
      return 0;
    }

    return Math.max(0, this.checklistStats.totalMandatory - this.checklistStats.completedMandatory);
  }

  goBack(): void {
    this.router.navigate(['/admin/transit/travel-plans']);
  }

  retryAll(): void {
    this.loadAll();
  }

  statusLabel(status: TravelPlanStatus): string {
    const labels: Record<TravelPlanStatus, string> = {
      DRAFT: 'Draft',
      IN_PREPARATION: 'In Preparation',
      SUBMITTED: 'Submitted',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled'
    };

    return labels[status] ?? status;
  }

  statusClass(status: TravelPlanStatus): string {
    return `status-${String(status).toLowerCase()}`;
  }

  safetyClass(status?: string): string {
    const normalized = String(status ?? 'PENDING').toUpperCase();
    if (normalized === 'VALID') {
      return 'safety-valid';
    }

    if (normalized === 'ALERT') {
      return 'safety-alert';
    }

    if (normalized === 'INVALID') {
      return 'safety-invalid';
    }

    return 'safety-pending';
  }

  safetyLabel(status?: string): string {
    const normalized = String(status ?? 'PENDING').toUpperCase();
    if (normalized === 'VALID') {
      return 'Valid';
    }

    if (normalized === 'ALERT') {
      return 'Alert';
    }

    if (normalized === 'INVALID') {
      return 'Invalid';
    }

    return 'Pending';
  }

  transportIcon(type?: string): string {
    const normalized = String(type ?? '').toUpperCase();

    if (normalized === 'TRAIN') {
      return 'train';
    }

    if (normalized === 'PLANE') {
      return 'flight';
    }

    if (normalized === 'BUS') {
      return 'directions_bus';
    }

    if (normalized === 'CAR') {
      return 'directions_car';
    }

    return 'alt_route';
  }

  transportLabel(type?: string): string {
    const normalized = String(type ?? '').toUpperCase();

    if (normalized === 'TRAIN') {
      return 'Train';
    }

    if (normalized === 'PLANE') {
      return 'Plane';
    }

    if (normalized === 'BUS') {
      return 'Bus';
    }

    if (normalized === 'CAR') {
      return 'Car';
    }

    return '—';
  }

  readinessClass(score?: number): string {
    const normalized = Number(score ?? 0);

    if (normalized < 40) {
      return 'readiness-low';
    }

    if (normalized < 80) {
      return 'readiness-medium';
    }

    return 'readiness-high';
  }

  readinessValue(score?: number): number {
    const normalized = Number(score ?? 0);
    if (!Number.isFinite(normalized)) {
      return 0;
    }

    return Math.max(0, Math.min(100, normalized));
  }

  showDecisionPanel(): boolean {
    return this.plan?.status === 'SUBMITTED';
  }

  canRejectPlan(): boolean {
    return !this.decisionSubmitting && this.decisionCommentControl.value.trim().length > 0;
  }

  approvePlan(): void {
    if (!this.plan || this.decisionSubmitting) {
      return;
    }

    const comment = this.decisionCommentControl.value.trim();
    this.decisionSubmitting = true;

    this.travelPlanAdminService
      .approvePlan(this.plan.id, comment)
      .pipe(
        finalize(() => {
          this.decisionSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.transitToastService.success('Plan approved', 'Plan approved successfully.');
          this.router.navigate(['/admin/transit/travel-plans']);
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to approve this travel plan right now.';
          this.transitToastService.error('Approval failed', message);
        }
      });
  }

  rejectPlan(): void {
    if (!this.plan || !this.canRejectPlan()) {
      this.decisionCommentControl.markAsTouched();
      return;
    }

    const comment = this.decisionCommentControl.value.trim();
    this.decisionSubmitting = true;

    this.travelPlanAdminService
      .rejectPlan(this.plan.id, comment)
      .pipe(
        finalize(() => {
          this.decisionSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.transitToastService.error('Plan rejected', 'Plan rejected.');
          this.router.navigate(['/admin/transit/travel-plans']);
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to reject this travel plan right now.';
          this.transitToastService.error('Rejection failed', message);
        }
      });
  }

  openValidatePanel(docId: number): void {
    this.docActionPanel = { docId, mode: 'validate' };
    this.docActionCommentControl.clearValidators();
    this.docActionCommentControl.setValue('');
    this.docActionCommentControl.updateValueAndValidity();
  }

  openRejectPanel(docId: number): void {
    this.docActionPanel = { docId, mode: 'reject' };
    this.docActionCommentControl.setValidators([Validators.required]);
    this.docActionCommentControl.setValue('');
    this.docActionCommentControl.updateValueAndValidity();
  }

  openRejectDocDialog(doc: any): void {
    this.docToReject = doc;
    this.showRejectDocDialog = true;
  }

  cancelRejectDoc(): void {
    this.showRejectDocDialog = false;
    this.docToReject = null;
  }

  confirmRejectDoc(): void {
    this.rejectDocument(this.docToReject.id);
    this.cancelRejectDoc();
  }

  closeDocActionPanel(): void {
    if (this.docActionSubmitting) {
      return;
    }

    this.docActionPanel = null;
    this.docActionCommentControl.clearValidators();
    this.docActionCommentControl.setValue('');
    this.docActionCommentControl.updateValueAndValidity();
  }

  isDocActionOpen(docId: number, mode: DocumentActionMode): boolean {
    return this.docActionPanel?.docId === docId && this.docActionPanel?.mode === mode;
  }

  submitDocAction(document: TravelDocumentAdmin): void {
    if (!this.docActionPanel || this.docActionPanel.docId !== document.id || this.docActionSubmitting) {
      return;
    }

    const comment = this.docActionCommentControl.value.trim();

    if (this.docActionPanel.mode === 'reject' && !comment) {
      this.docActionCommentControl.markAsTouched();
      return;
    }

    if (this.docActionPanel.mode === 'reject') {
      this.rejectDocument(document.id);
      return;
    }

    this.docActionSubmitting = true;

    this.travelPlanAdminService
      .validateDocument(this.planId, document.id, comment)
      .pipe(
        finalize(() => {
          this.docActionSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.transitToastService.success('Document validated', 'Document validated successfully.');
          this.closeDocActionPanel();
          this.refreshAfterDocumentAction();
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to update document status at the moment.';
          this.transitToastService.error('Document action failed', message);
        }
      });
  }

  documentStatusClass(status: DocumentValidationStatus): string {
    return `doc-status-${String(status).toLowerCase()}`;
  }

  documentStatusLabel(status: DocumentValidationStatus): string {
    const labels: Record<DocumentValidationStatus, string> = {
      PENDING: 'Pending',
      VALID: 'Valid',
      REJECTED: 'Rejected',
      EXPIRED: 'Expired',
      INCOMPLETE: 'Incomplete'
    };

    return labels[status] ?? status;
  }

  documentTypeLabel(type: string): string {
    const normalized = String(type ?? '').toUpperCase();

    if (normalized === 'PET_PASSPORT') {
      return 'Pet Passport';
    }

    if (normalized === 'RABIES_VACCINE') {
      return 'Rabies Vaccine';
    }

    if (normalized === 'HEALTH_CERTIFICATE') {
      return 'Health Certificate';
    }

    if (normalized === 'TRANSPORT_AUTHORIZATION') {
      return 'Transport Authorization';
    }

    return normalized || 'Document';
  }

  documentTypeIcon(type: string): string {
    const normalized = String(type ?? '').toUpperCase();

    if (normalized === 'PET_PASSPORT') {
      return 'pets';
    }

    if (normalized === 'RABIES_VACCINE') {
      return 'healing';
    }

    if (normalized === 'HEALTH_CERTIFICATE') {
      return 'assignment_turned_in';
    }

    if (normalized === 'TRANSPORT_AUTHORIZATION') {
      return 'assignment';
    }

    return 'description';
  }

  openDocumentFile(fileUrl: string): void {
    const resolved = this.travelPlanAdminService.getAbsoluteDocumentUrl(fileUrl);
    if (!resolved) {
      return;
    }

    window.open(resolved, '_blank', 'noopener');
  }

  petPhotoUrl(pet: Pet | null): string | null {
    const normalized = String(pet?.photoUrl ?? '').trim();
    if (!normalized) {
      return null;
    }

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    return `${this.backendBaseUrl}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  }

  formatDate(value?: string): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return '—';
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return normalized;
    }

    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(parsed);
  }

  formatDateTime(value?: string): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return '—';
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return normalized;
    }

    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  }

  cageDimensions(plan: TravelPlanDetail): string {
    const length = this.toOptionalNumber(plan.cageLength);
    const width = this.toOptionalNumber(plan.cageWidth);
    const height = this.toOptionalNumber(plan.cageHeight);

    if (!length || !width || !height) {
      return '—';
    }

    return `${length} x ${width} x ${height} cm`;
  }

  trackByDocument(_: number, document: TravelDocumentAdmin): number {
    return document.id;
  }

  private rejectDocument(documentId: number): void {
    if (this.docActionSubmitting) {
      return;
    }

    const rejectionComment = this.docActionCommentControl.value.trim();
    this.docActionSubmitting = true;

    this.travelPlanAdminService
      .rejectDocument(this.planId, documentId, rejectionComment)
      .pipe(
        finalize(() => {
          this.docActionSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.transitToastService.error('Document rejected', 'Document rejected.');
          this.closeDocActionPanel();
          this.refreshAfterDocumentAction();
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to update document status at the moment.';
          this.transitToastService.error('Document action failed', message);
        }
      });
  }

  private loadAll(): void {
    this.pageError = '';

    this.loadPlan();
    this.loadDocuments();
    this.loadChecklistStats();
  }

  private loadPlan(): void {
    this.planLoading = true;
    this.petProfile = null;
    this.petLoading = false;

    this.travelPlanAdminService
      .getPlanById(this.planId)
      .pipe(
        finalize(() => {
          this.planLoading = false;
        })
      )
      .subscribe({
        next: (plan) => {
          this.plan = plan;
          this.loadPetProfile(plan.petId);
        },
        error: (error: unknown) => {
          this.plan = null;
          this.petProfile = null;
          this.petLoading = false;
          this.pageError =
            error instanceof Error
              ? error.message
              : 'Unable to load travel plan details.';
          this.transitToastService.error('Plan loading failed', this.pageError);
        }
      });
  }

  private loadPetProfile(petId: number): void {
    const normalizedPetId = Number(petId ?? 0);
    if (!Number.isFinite(normalizedPetId) || normalizedPetId <= 0) {
      this.petProfile = null;
      this.petLoading = false;
      return;
    }

    this.petLoading = true;
    this.petProfile = null;

    this.travelPlanAdminService
      .getPetById(normalizedPetId)
      .pipe(
        finalize(() => {
          this.petLoading = false;
        })
      )
      .subscribe({
        next: (pet) => {
          this.petProfile = {
            id: Number(pet.id ?? 0),
            name: String(pet.name ?? '').trim() || `Pet #${normalizedPetId}`,
            species: String(pet.species ?? '').trim() || 'UNKNOWN',
            breed: String(pet.breed ?? '').trim() || 'Unknown breed',
            weight: Number(pet.weight ?? 0),
            photoUrl: String(pet.photoUrl ?? '').trim() || undefined,
            gender: String(pet.gender ?? '').trim() || 'Unknown'
          };
        },
        error: () => {
          this.petProfile = null;
        }
      });
  }

  private loadDocuments(): void {
    this.documentsLoading = true;

    this.travelPlanAdminService
      .getDocuments(this.planId)
      .pipe(
        finalize(() => {
          this.documentsLoading = false;
        })
      )
      .subscribe({
        next: (documents) => {
          this.documents = documents;
        },
        error: (error: unknown) => {
          this.documents = [];
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load travel documents.';
          this.transitToastService.error('Documents loading failed', message);
        }
      });
  }

  private loadChecklistStats(): void {
    this.checklistLoading = true;

    this.travelPlanAdminService
      .getChecklistStats(this.planId)
      .pipe(
        finalize(() => {
          this.checklistLoading = false;
        })
      )
      .subscribe({
        next: (stats) => {
          this.checklistStats = stats;
        },
        error: (error: unknown) => {
          this.checklistStats = null;
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load checklist stats.';
          this.transitToastService.error('Checklist loading failed', message);
        }
      });
  }

  private refreshAfterDocumentAction(): void {
    this.loadPlan();
    this.loadDocuments();
    this.loadChecklistStats();
  }

  private toOptionalNumber(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }
}
