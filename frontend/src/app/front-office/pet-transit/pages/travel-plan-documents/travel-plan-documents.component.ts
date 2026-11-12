import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import {
  DOCUMENT_CONFIG,
  DocumentType,
  DocumentValidationStatus
} from '../../models/travel-document.model';
import { DocumentDetailsModalComponent } from '../../components/document-details-modal/document-details-modal.component';
import { EditDocumentModalComponent } from '../../components/edit-document-modal/edit-document-modal.component';
import { UploadDocumentModalComponent } from '../../components/upload-document-modal/upload-document-modal.component';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';
import {
  TravelDocumentResponse,
  TravelDocumentService
} from '../../services/travel-document.service';

interface StatusBadge {
  label: string;
  icon: string;
  colorClass: string;
}

interface RequiredDocumentCard {
  type: DocumentType;
  label: string;
  icon: string;
  uploadedDocument: TravelDocumentResponse | null;
  status: StatusBadge;
}

@Component({
  selector: 'app-travel-plan-documents',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    UploadDocumentModalComponent,
    EditDocumentModalComponent,
    DocumentDetailsModalComponent
  ],
  templateUrl: './travel-plan-documents.component.html',
  styleUrl: './travel-plan-documents.component.scss'
})
export class TravelPlanDocumentsComponent implements OnInit, OnDestroy {
  readonly documentConfig = DOCUMENT_CONFIG;
  readonly documentTypes: DocumentType[] = [
    'PET_PASSPORT',
    'RABIES_VACCINE',
    'HEALTH_CERTIFICATE',
    'TRANSPORT_AUTHORIZATION'
  ];

  planId = 0;
  userId = '';

  travelPlan: any = null;
  destination: any = null;

  requiredDocuments: DocumentType[] = [];
  uploadedDocuments: TravelDocumentResponse[] = [];

  pageLoading = true;
  pageError = '';

  requiredLoading = false;
  requiredError = '';

  documentsLoading = false;
  documentsError = '';

  uploadModalOpen = false;
  uploadPreselectedType: string | null = null;

  selectedDocForEdit: TravelDocumentResponse | null = null;
  selectedDocForDetails: TravelDocumentResponse | null = null;
  docToDelete: TravelDocumentResponse | null = null;
  showDeleteConfirm = false;

  deletingDocId: number | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly travelDocumentService: TravelDocumentService,
    private readonly toastService: PetTransitToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const rawPlanId = this.resolvePlanIdParam();
      this.planId = Number(rawPlanId);
      this.userId = this.resolveCurrentUserId();

      console.log('[TravelPlanDocuments] route planId:', rawPlanId);
      console.log('[TravelPlanDocuments] parsed planId:', this.planId);
      console.log('[TravelPlanDocuments] route params snapshot:', this.route.snapshot.paramMap.keys);
      console.log('[TravelPlanDocuments] userId header value source:', this.userId);

      if (!Number.isFinite(this.planId) || this.planId <= 0) {
        this.pageLoading = false;
        this.pageError = 'Invalid travel plan id.';
        this.requiredDocuments = [];
        this.uploadedDocuments = [];
        return;
      }

      if (!this.userId) {
        this.pageLoading = false;
        this.pageError = 'You must be logged in to view travel documents.';
        this.requiredDocuments = [];
        this.uploadedDocuments = [];
        return;
      }

      this.loadPageData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get requiredCards(): RequiredDocumentCard[] {
    return this.requiredDocuments.map((type) => {
      const uploadedDocument = this.findLatestByType(type);

      return {
        type,
        label: this.documentConfig[type].label,
        icon: this.documentConfig[type].icon,
        uploadedDocument,
        status: uploadedDocument
          ? this.statusBadge(uploadedDocument.validationStatus)
          : {
              label: 'Not Uploaded',
              icon: 'cloud_upload',
              colorClass: 'status-not-uploaded'
            }
      };
    });
  }

  goBack(): void {
    this.router.navigate(['/app/transit/plans', this.planId]);
  }

  openUploadModal(preselectedType: string | null = null): void {
    this.uploadPreselectedType = preselectedType;
    this.uploadModalOpen = true;
  }

  closeUploadModal(): void {
    this.uploadModalOpen = false;
    this.uploadPreselectedType = null;
  }

  onDocumentUploaded(): void {
    this.closeUploadModal();
    this.loadDocuments();
  }

  openEditModal(doc: TravelDocumentResponse): void {
    this.selectedDocForEdit = doc;
  }

  closeEditModal(): void {
    this.selectedDocForEdit = null;
  }

  onDocumentUpdated(): void {
    this.closeEditModal();
    this.loadDocuments();
  }

  openDetailsModal(doc: TravelDocumentResponse): void {
    this.selectedDocForDetails = doc;
  }

  closeDetailsModal(): void {
    this.selectedDocForDetails = null;
  }

  confirmDelete(doc: TravelDocumentResponse): void {
    this.docToDelete = doc;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.docToDelete = null;
    this.showDeleteConfirm = false;
  }

  executeDelete(): void {
    if (!this.docToDelete) {
      return;
    }

    this.deletingDocId = this.docToDelete.id;

    this.travelDocumentService
      .deleteDocument(this.planId, this.docToDelete.id)
      .pipe(
        finalize(() => {
          this.deletingDocId = null;
          this.cancelDelete();
        })
      )
      .subscribe({
        next: () => {
          this.toastService.success('Document deleted successfully.');
          this.loadDocuments();
        },
        error: (error: unknown) => {
          this.toastService.error(this.extractErrorMessage(error, 'Failed to delete document.'));
        }
      });
  }

  retryDocuments(): void {
    this.loadDocuments();
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) {
      return '—';
    }

    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }

    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateRange(issue: string | null | undefined, expiry: string | null | undefined): string {
    if (issue && expiry) {
      return `${this.formatDate(issue)} → ${this.formatDate(expiry)}`;
    }

    return this.formatDate(issue || expiry);
  }

  trackByRequiredType(_: number, card: RequiredDocumentCard): string {
    return card.type;
  }

  trackByDocument(_: number, document: TravelDocumentResponse): number {
    return document.id;
  }

  private loadPageData(): void {
    this.pageLoading = true;
    this.pageError = '';
    this.requiredError = '';
    this.documentsError = '';

    this.travelDocumentService
      .getPlanById(this.planId)
      .pipe(
        finalize(() => {
          this.pageLoading = false;
        })
      )
      .subscribe({
        next: (plan) => {
          this.travelPlan = plan;
          const destinationId = Number(plan?.destinationId ?? 0);

          if (Number.isFinite(destinationId) && destinationId > 0) {
            this.loadDestination(destinationId);
          } else {
            this.requiredDocuments = [];
            this.requiredError = 'Destination information is missing for this plan.';
          }

          this.loadDocuments();
        },
        error: (error: unknown) => {
          this.pageError = this.extractErrorMessage(error, 'Failed to load travel plan.');
        }
      });
  }

  private resolvePlanIdParam(): string {
    const currentSnapshot = this.route.snapshot;
    const currentValue = currentSnapshot.paramMap.get('planId') ?? currentSnapshot.paramMap.get('id');

    if (currentValue) {
      return currentValue;
    }

    let parent: ActivatedRouteSnapshot | null = currentSnapshot.parent;
    while (parent) {
      const parentValue = parent.paramMap.get('planId') ?? parent.paramMap.get('id');
      if (parentValue) {
        return parentValue;
      }

      parent = parent.parent;
    }

    return '';
  }

  private resolveCurrentUserId(): string {
    const keys = ['userId', 'elif_user', 'elif.session.user'];

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      const normalizedRaw = String(raw).trim().replace(/^"+|"+$/g, '');
      if (!normalizedRaw) {
        continue;
      }

      if (/^\d+$/.test(normalizedRaw)) {
        return normalizedRaw;
      }

      try {
        const parsed = JSON.parse(normalizedRaw) as { id?: unknown };
        const parsedId = String(parsed?.id ?? '').trim().replace(/^"+|"+$/g, '');
        if (/^\d+$/.test(parsedId)) {
          return parsedId;
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  private loadDestination(destinationId: number): void {
    this.requiredLoading = true;
    this.requiredError = '';

    this.travelDocumentService
      .getDestination(destinationId)
      .pipe(
        finalize(() => {
          this.requiredLoading = false;
        })
      )
      .subscribe({
        next: (destination) => {
          this.destination = destination;
          this.requiredDocuments = this.normalizeRequiredDocuments(destination?.requiredDocuments);
        },
        error: (error: unknown) => {
          this.requiredDocuments = [];
          this.requiredError = this.extractErrorMessage(
            error,
            'Failed to load required documents configuration.'
          );
        }
      });
  }

  private loadDocuments(): void {
    this.documentsLoading = true;
    this.documentsError = '';

    console.log('[TravelPlanDocuments] loading documents for planId:', this.planId);

    this.travelDocumentService
      .getDocuments(this.planId)
      .pipe(
        finalize(() => {
          this.documentsLoading = false;
        })
      )
      .subscribe({
        next: (documents) => {
          this.uploadedDocuments = [...(documents ?? [])].sort(
            (left, right) => this.toTimestamp(right.uploadedAt) - this.toTimestamp(left.uploadedAt)
          );
        },
        error: (error: unknown) => {
          this.uploadedDocuments = [];
          this.documentsError = this.extractErrorMessage(error, 'Failed to load documents.');
          this.toastService.error('Failed to load documents.');
        }
      });
  }

  private findLatestByType(type: DocumentType): TravelDocumentResponse | null {
    const matching = this.uploadedDocuments.filter((item) => item.documentType === type);
    return matching.length > 0 ? matching[0] : null;
  }

  statusBadge(status: DocumentValidationStatus): StatusBadge {
    const normalized = String(status ?? '').trim().toUpperCase();

    if (normalized === 'VALID') {
      return { label: 'Validated', icon: 'check_circle', colorClass: 'status-valid' };
    }

    if (normalized === 'REJECTED') {
      return { label: 'Rejected', icon: 'cancel', colorClass: 'status-rejected' };
    }

    if (normalized === 'EXPIRED') {
      return { label: 'Expired', icon: 'event_busy', colorClass: 'status-expired' };
    }

    if (normalized === 'INCOMPLETE') {
      return { label: 'Incomplete', icon: 'warning', colorClass: 'status-incomplete' };
    }

    return { label: 'Pending Review', icon: 'hourglass_empty', colorClass: 'status-pending' };
  }

  private normalizeRequiredDocuments(rawRequiredDocuments: unknown): DocumentType[] {
    if (!Array.isArray(rawRequiredDocuments)) {
      return [];
    }

    const normalized = rawRequiredDocuments
      .map((item) => String(item ?? '').trim().toUpperCase())
      .filter((item) => this.documentTypes.includes(item as DocumentType)) as DocumentType[];

    return Array.from(new Set(normalized));
  }

  private toTimestamp(value: string): number {
    const parsed = Date.parse(String(value ?? ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const httpError = error as { error?: unknown; message?: string };

    if (typeof httpError.error === 'string' && httpError.error.trim()) {
      return httpError.error.trim();
    }

    if (httpError.error && typeof httpError.error === 'object') {
      const payload = httpError.error as Record<string, unknown>;
      const message = String(payload['message'] ?? payload['error'] ?? '').trim();
      if (message) {
        return message;
      }
    }

    if (typeof httpError.message === 'string' && httpError.message.trim()) {
      return httpError.message.trim();
    }

    return fallback;
  }
}
