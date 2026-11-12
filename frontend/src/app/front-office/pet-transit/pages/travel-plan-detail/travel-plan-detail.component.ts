import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { ChecklistStats } from '../../models/safety-checklist.model';
import { TravelDestination } from '../../models/travel-destination.model';
import {
  RequiredDocumentType,
  SafetyStatus,
  TRANSPORT_TYPE_LABELS,
  TravelPlan,
  TravelPlanStatus
} from '../../models/travel-plan.model';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';
import { SafetyChecklistService } from '../../services/safety-checklist.service';
import { TravelDestinationService } from '../../services/travel-destination.service';
import {
  RiskAssessment,
  TravelPlanDocument,
  TravelPlanService
} from '../../services/travel-plan.service';

type RequiredDocumentState =
  | 'VALIDATED'
  | 'PENDING'
  | 'INCOMPLETE'
  | 'EXPIRED'
  | 'REJECTED'
  | 'NOT_UPLOADED';

type RequiredDocumentRow = {
  type: RequiredDocumentType;
  label: string;
  icon: string;
  state: RequiredDocumentState;
  stateLabel: string;
  stateIcon: string;
  stateClass: string;
  fileName?: string;
};

type PetProfile = {
  id: number;
  name: string;
  species: string;
  breed: string;
  weight: number;
  photoUrl?: string;
  gender: string;
};

@Component({
  selector: 'app-travel-plan-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './travel-plan-detail.component.html',
  styleUrl: './travel-plan-detail.component.scss'
})
export class TravelPlanDetailComponent implements OnInit, OnDestroy {
  private static readonly SUBMIT_THRESHOLD = 70;
  private static readonly ALMOST_READY_THRESHOLD = 55;
  private static readonly DOCUMENT_MAX_POINTS = 40;
  private static readonly CHECKLIST_MAX_POINTS = 20;
  private static readonly PET_INFO_MAX_POINTS = 20;
  private static readonly ADMIN_VALIDATION_MAX_POINTS = 20;
  private static readonly OPTIONAL_FIELD_POINTS = 5;
  private readonly backendHost = 'http://localhost:8087';
  private readonly backendContext = '/elif';
  private readonly petsApiUrl = `${this.backendHost}${this.backendContext}/api/user-pets`;

  readonly statusLabels: Record<TravelPlanStatus, string> = {
    DRAFT: 'Draft',
    IN_PREPARATION: 'In Preparation',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  };

  readonly documentLabelMap: Record<RequiredDocumentType, string> = {
    PET_PASSPORT: 'Pet Passport',
    RABIES_VACCINE: 'Rabies Vaccine',
    HEALTH_CERTIFICATE: 'Health Certificate',
    TRANSPORT_AUTHORIZATION: 'Transport Authorization'
  };

  readonly documentIconMap: Record<RequiredDocumentType, string> = {
    PET_PASSPORT: 'pets',
    RABIES_VACCINE: 'healing',
    HEALTH_CERTIFICATE: 'assignment_turned_in',
    TRANSPORT_AUTHORIZATION: 'assignment'
  };

  plan: TravelPlan | null = null;
  petProfile: PetProfile | null = null;
  destination: TravelDestination | null = null;
  uploadedDocuments: TravelPlanDocument[] = [];
  checklistStats: ChecklistStats | null = null;
  riskAssessment: RiskAssessment | null = null;
  riskLoading = false;
  riskLoaded = false;
  showRiskReport = false;
  showCancelDialog = false;
  planToCancel: TravelPlan | null = null;

  heroImages: string[] = [];
  currentImageIndex = 0;

  loading = true;
  petLoading = false;
  destinationLoading = false;
  documentsLoading = false;
  checklistLoading = false;
  submitting = false;
  cancelling = false;
  errorMessage = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly travelPlanService: TravelPlanService,
    private readonly destinationService: TravelDestinationService,
    private readonly safetyChecklistService: SafetyChecklistService,
    private readonly toastService: PetTransitToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadPlan();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasMultipleImages(): boolean {
    return this.heroImages.length > 1;
  }

  get currentHeroImage(): string {
    return this.heroImages[this.currentImageIndex] ?? '';
  }

  get requiredDocumentRows(): RequiredDocumentRow[] {
    const required = this.destinationRequiredDocuments();
    return required.map((documentType) => this.buildDocumentRow(documentType));
  }

  goBack(): void {
    this.router.navigate(['/app/transit/plans/my']);
  }

  retryLoad(): void {
    this.loadPlan();
  }

  showPreviousImage(): void {
    if (!this.hasMultipleImages) {
      return;
    }

    this.currentImageIndex =
      this.currentImageIndex === 0 ? this.heroImages.length - 1 : this.currentImageIndex - 1;
  }

  showNextImage(): void {
    if (!this.hasMultipleImages) {
      return;
    }

    this.currentImageIndex =
      this.currentImageIndex >= this.heroImages.length - 1 ? 0 : this.currentImageIndex + 1;
  }

  selectImage(index: number): void {
    if (index < 0 || index >= this.heroImages.length) {
      return;
    }

    this.currentImageIndex = index;
  }

  trackByImage(index: number): number {
    return index;
  }

  trackByRequiredDocument(_: number, row: RequiredDocumentRow): string {
    return row.type;
  }

  trackByMissingItem(index: number, item: string): string {
    return `${index}-${item}`;
  }

  statusLabel(status: TravelPlanStatus): string {
    return this.statusLabels[status] ?? status;
  }

  statusClass(status: TravelPlanStatus): string {
    const classes: Record<TravelPlanStatus, string> = {
      DRAFT: 'status-draft',
      IN_PREPARATION: 'status-in-preparation',
      SUBMITTED: 'status-submitted',
      APPROVED: 'status-approved',
      REJECTED: 'status-rejected',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled'
    };

    return classes[status];
  }

  safetyClass(status: SafetyStatus): string {
    const classes: Record<SafetyStatus, string> = {
      PENDING: 'safety-pending',
      VALID: 'safety-valid',
      ALERT: 'safety-alert',
      INVALID: 'safety-invalid'
    };

    return classes[status];
  }

  safetyLabel(status: SafetyStatus): string {
    const labels: Record<SafetyStatus, string> = {
      PENDING: 'Pending',
      VALID: 'Valid',
      ALERT: 'Alert',
      INVALID: 'Invalid'
    };

    return labels[status];
  }

  transportLabel(value?: TravelPlan['transportType']): string {
    if (!value) {
      return '-';
    }

    return TRANSPORT_TYPE_LABELS[value] ?? value;
  }

  transportIcon(value?: TravelPlan['transportType']): string {
    const iconMap = {
      CAR: 'directions_car',
      TRAIN: 'train',
      PLANE: 'flight',
      BUS: 'directions_bus'
    } as const;

    if (!value) {
      return 'alt_route';
    }

    return iconMap[value] ?? 'alt_route';
  }

  readinessClass(score: number): string {
    if (score < 40) {
      return 'readiness-low';
    }

    if (score < TravelPlanDetailComponent.SUBMIT_THRESHOLD) {
      return 'readiness-medium';
    }

    return 'readiness-high';
  }

  readinessStateLabel(score: number): string {
    if (this.isReadyScore(score)) {
      return 'Ready to Submit';
    }

    if (score >= TravelPlanDetailComponent.ALMOST_READY_THRESHOLD) {
      return 'Almost Ready';
    }

    return 'Not Ready';
  }

  readinessStateIcon(score: number): string {
    if (this.isReadyScore(score)) {
      return 'task_alt';
    }

    if (score >= TravelPlanDetailComponent.ALMOST_READY_THRESHOLD) {
      return 'pending_actions';
    }

    return 'info';
  }

  readinessStateClass(score: number): string {
    if (this.isReadyScore(score)) {
      return 'readiness-state-ready';
    }

    if (score >= TravelPlanDetailComponent.ALMOST_READY_THRESHOLD) {
      return 'readiness-state-almost';
    }

    return 'readiness-state-not-ready';
  }

  documentsPointsLabel(): string {
    return this.formatPoints(
      this.documentsReadinessPoints(),
      TravelPlanDetailComponent.DOCUMENT_MAX_POINTS
    );
  }

  checklistPointsLabel(): string {
    if (this.checklistLoading) {
      return 'Loading...';
    }

    return this.formatPoints(
      this.checklistReadinessPoints(),
      TravelPlanDetailComponent.CHECKLIST_MAX_POINTS
    );
  }

  petInfoPointsLabel(plan: TravelPlan): string {
    return this.formatPoints(
      this.petInfoReadinessPoints(plan),
      TravelPlanDetailComponent.PET_INFO_MAX_POINTS
    );
  }

  adminValidationPointsLabel(plan: TravelPlan): string {
    return this.formatPoints(
      this.adminValidationReadinessPoints(plan),
      TravelPlanDetailComponent.ADMIN_VALIDATION_MAX_POINTS
    );
  }

  readinessGuidance(plan: TravelPlan): string {
    return this.canSubmitPlan(plan)
      ? 'Ready to submit at 70%. Final admin validation is still required to reach 100%.'
      : 'Complete missing requirements to reach 70% and submit your plan.';
  }

  showSubmitThresholdWarning(plan: TravelPlan): boolean {
    return this.showEditableActions(plan) && Number(plan.readinessScore ?? 0) < TravelPlanDetailComponent.SUBMIT_THRESHOLD;
  }

  showPendingAdminReviewWarning(plan: TravelPlan): boolean {
    if (plan.status === 'APPROVED' || plan.status === 'COMPLETED') {
      return false;
    }

    return this.allRequiredDocumentsUploaded() && this.hasPendingOrIncompleteDocuments() && !this.hasRejectedDocuments();
  }

  showRejectedDocumentsWarning(): boolean {
    return this.hasRejectedDocuments();
  }

  hasReadinessMissingItems(plan: TravelPlan): boolean {
    return this.readinessMissingItems(plan).length > 0;
  }

  readinessMissingItems(plan: TravelPlan): string[] {
    const items: string[] = [];

    const missingDocumentLabels = this.missingRequiredDocumentLabels();
    if (missingDocumentLabels.length > 0) {
      items.push(`Missing required documents: ${missingDocumentLabels.join(', ')}`);
    }

    const checklistGap = this.checklistGapLabel();
    if (checklistGap) {
      items.push(checklistGap);
    }

    const missingOptionalFields = this.missingOptionalFieldLabels(plan);
    if (missingOptionalFields.length > 0) {
      items.push(`Missing pet / travel info: ${missingOptionalFields.join(', ')}`);
    }

    return items;
  }

  cageDimensions(plan: TravelPlan): string {
    const length = this.asPositiveOrNull(plan.cageLength);
    const width = this.asPositiveOrNull(plan.cageWidth);
    const height = this.asPositiveOrNull(plan.cageHeight);

    if (!length || !width || !height) {
      return '-';
    }

    return `${length} x ${width} x ${height} cm`;
  }

  petDisplayName(plan: TravelPlan): string {
    const hydratedName = this.pickPetText(this.petProfile?.name);
    if (hydratedName) {
      return hydratedName;
    }

    const pet = this.extractPetRecord(plan);
    const explicitName = this.pickPetText(plan.petName, pet?.['name']);
    if (explicitName) {
      return explicitName;
    }

    if (plan.petId && plan.petId > 0) {
      return `Pet #${plan.petId}`;
    }

    return 'Unknown Pet';
  }

  petImageUrl(plan: TravelPlan): string | null {
    const hydratedImage = this.resolvePetImageUrl(this.petProfile?.photoUrl);
    if (hydratedImage) {
      return hydratedImage;
    }

    const pet = this.extractPetRecord(plan);
    const source = plan as unknown as Record<string, unknown>;
    return this.resolvePetImageUrl(
      pet?.['imageUrl'],
      pet?.['photoUrl'],
      pet?.['profilePhoto'],
      pet?.['avatarUrl'],
      source['petImageUrl'],
      source['petPhotoUrl'],
      source['petProfilePhoto']
    );
  }

  petBreed(plan: TravelPlan): string | null {
    const hydratedBreed = this.pickPetText(this.petProfile?.breed);
    if (hydratedBreed) {
      return hydratedBreed;
    }

    const pet = this.extractPetRecord(plan);
    const source = plan as unknown as Record<string, unknown>;
    return this.pickPetText(
      pet?.['breed'],
      source['petBreed']
    );
  }

  petSpecies(plan: TravelPlan): string | null {
    const hydratedSpecies = this.pickPetText(this.petProfile?.species);
    if (hydratedSpecies) {
      return hydratedSpecies;
    }

    const pet = this.extractPetRecord(plan);
    const source = plan as unknown as Record<string, unknown>;
    return this.pickPetText(
      pet?.['species'],
      source['petSpecies']
    );
  }

  onPetImgError(event: Event): void {
    (event.target as HTMLImageElement).src = '/images/animals/cat.png';
  }

  loadRiskAssessment(): void {
    if (!this.plan?.id) {
      return;
    }

    this.riskLoading = true;
    this.riskAssessment = null;

    this.travelPlanService
      .getRiskAssessment(this.plan.id)
      .subscribe({
        next: (result) => {
          this.riskAssessment = result;
          this.riskLoading = false;
          this.riskLoaded = true;
          this.showRiskReport = true;

          setTimeout(() => {
            document.getElementById('risk-report')
              ?.scrollIntoView({ behavior: 'smooth' });
          }, 200);
        },
        error: () => {
          this.riskLoading = false;
          this.riskLoaded = false;
          this.showRiskReport = false;
        }
      });
  }

  getRiskColor(): string {
    switch (this.riskAssessment?.riskLevel) {
      case 'LOW':
        return '#16a34a';
      case 'MEDIUM':
        return '#d97706';
      case 'HIGH':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  }

  getRiskBackground(): string {
    switch (this.riskAssessment?.riskLevel) {
      case 'LOW':
        return '#f0fdf4';
      case 'MEDIUM':
        return '#fffbeb';
      case 'HIGH':
        return '#fff5f5';
      default:
        return '#f8fafc';
    }
  }

  getRiskIcon(): string {
    switch (this.riskAssessment?.riskLevel) {
      case 'LOW':
        return 'check_circle';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'dangerous';
      default:
        return 'help_outline';
    }
  }

  getRiskLabel(): string {
    switch (this.riskAssessment?.riskLevel) {
      case 'LOW':
        return 'Low Risk - Your pet is ready to travel';
      case 'MEDIUM':
        return 'Medium Risk - Some issues need attention';
      case 'HIGH':
        return 'High Risk - Critical issues must be resolved';
      default:
        return 'Analysis unavailable';
    }
  }

  showEditableActions(plan: TravelPlan): boolean {
    return ['DRAFT', 'IN_PREPARATION'].includes(plan.status);
  }

  canShowRiskAssessment(plan: TravelPlan): boolean {
    return plan.status !== 'CANCELLED';
  }

  canSubmitPlan(plan: TravelPlan): boolean {
    return this.showEditableActions(plan) && this.isReadyScore(plan.readinessScore);
  }

  showReviewMetadata(plan: TravelPlan): boolean {
    return ['APPROVED', 'REJECTED'].includes(plan.status);
  }

  canCancel(plan: TravelPlan): boolean {
    return ['SUBMITTED', 'APPROVED'].includes(plan.status);
  }

  showRejectedCommentBanner(plan: TravelPlan): boolean {
    return plan.status === 'REJECTED' && Boolean(plan.adminDecisionComment?.trim());
  }

  goToDocuments(planId: number): void {
    const normalizedPlanId = Number(planId);
    console.log('[TravelPlanDetail] navigating to documents with planId:', normalizedPlanId);

    if (!Number.isFinite(normalizedPlanId) || normalizedPlanId <= 0) {
      this.toastService.error('Unable to open documents: invalid plan id.');
      return;
    }

    this.router.navigate(['/app/transit/plans', normalizedPlanId, 'documents']);
  }

  goToChecklist(planId: number): void {
    const normalizedPlanId = Number(planId);

    if (!Number.isFinite(normalizedPlanId) || normalizedPlanId <= 0) {
      this.toastService.error('Unable to open checklist: invalid plan id.');
      return;
    }

    this.router.navigate(['/app/transit/plans', normalizedPlanId, 'checklist']);
  }

  goToFeedback(planId: number): void {
    this.router.navigate(['/app/transit/plans', planId, 'feedback']);
  }

  editPlan(planId: number): void {
    this.router.navigate(['/app/transit/plans', planId, 'edit']);
  }

  openCancelDialog(plan: TravelPlan): void {
    if (!this.canCancel(plan)) {
      return;
    }

    this.planToCancel = plan;
    this.showCancelDialog = true;
  }

  closeCancelDialog(): void {
    this.showCancelDialog = false;
    this.planToCancel = null;
  }

  cancelPlan(): void {
    if (!this.planToCancel || this.cancelling) {
      return;
    }

    this.cancelling = true;

    this.travelPlanService
      .cancelPlan(this.planToCancel.id)
      .pipe(
        finalize(() => {
          this.cancelling = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (updatedPlan) => {
          this.plan = updatedPlan;
          this.closeCancelDialog();
          this.toastService.success('Travel plan cancelled successfully.');
        },
        error: (error: unknown) => {
          this.toastService.error(
            error instanceof Error ? error.message : 'Could not cancel this plan.'
          );
        }
      });
  }

  submitPlan(plan: TravelPlan): void {
    if (!this.canSubmitPlan(plan) || this.submitting) {
      return;
    }

    this.submitting = true;

    this.travelPlanService
      .submitTravelPlan(plan.id)
      .pipe(
        finalize(() => {
          this.submitting = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (updatedPlan) => {
          this.plan = updatedPlan;
          this.loadPetProfile(updatedPlan.petId);
          this.toastService.success('Travel plan submitted successfully.');
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to submit this travel plan right now. Please try again.';
          this.toastService.error(message);
        }
      });
  }

  private loadPlan(): void {
    const planId = Number(this.route.snapshot.paramMap.get('id'));

    if (Number.isNaN(planId) || planId <= 0) {
      this.loading = false;
      this.plan = null;
      this.errorMessage = 'Invalid travel plan identifier.';
      this.toastService.error(this.errorMessage);
      return;
    }

    this.loading = true;
    this.plan = null;
    this.petProfile = null;
    this.petLoading = false;
    this.destination = null;
    this.uploadedDocuments = [];
    this.checklistStats = null;
    this.riskAssessment = null;
    this.riskLoading = false;
    this.riskLoaded = false;
    this.showRiskReport = false;
    this.heroImages = [];
    this.currentImageIndex = 0;
    this.errorMessage = '';

    this.travelPlanService
      .getTravelPlanById(planId)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (plan) => {
          this.plan = plan;
          this.loadPetProfile(plan.petId);
          this.loadDestination(plan.destinationId);
          this.loadUploadedDocuments(plan.id);
          this.loadChecklistStats(plan.id);
        },
        error: (error: unknown) => {
          const isSessionMissing = !this.travelPlanService.getCurrentUserId();
          this.errorMessage = isSessionMissing
            ? 'Your session is missing. Please sign in again and retry.'
            : error instanceof Error
              ? error.message
              : 'Unable to load travel plan details.';
          this.toastService.error(this.errorMessage);
        }
      });
  }

  private loadDestination(destinationId: number): void {
    this.destinationLoading = true;

    this.destinationService
      .getDestinationById(destinationId)
      .pipe(
        finalize(() => {
          this.destinationLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (destination) => {
          this.destination = destination;
          this.heroImages = this.buildHeroImages(destination);
          this.currentImageIndex = 0;
        },
        error: (error: unknown) => {
          this.destination = null;
          this.heroImages = [];
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load destination media right now.';
          this.toastService.error(message);
        }
      });
  }

  private loadUploadedDocuments(planId: number): void {
    this.documentsLoading = true;

    this.travelPlanService
      .getTravelPlanDocuments(planId)
      .pipe(
        finalize(() => {
          this.documentsLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (documents) => {
          this.uploadedDocuments = documents;
        },
        error: (error: unknown) => {
          this.uploadedDocuments = [];
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load travel plan documents right now.';
          this.toastService.error(message);
        }
      });
  }

  private loadChecklistStats(planId: number): void {
    this.checklistLoading = true;

    this.safetyChecklistService
      .getStats(planId)
      .pipe(
        finalize(() => {
          this.checklistLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (stats) => {
          this.checklistStats = stats;
        },
        error: () => {
          this.checklistStats = null;
        }
      });
  }

  private loadPetProfile(petId?: number): void {
    const normalizedPetId = Number(petId ?? 0);
    if (!Number.isFinite(normalizedPetId) || normalizedPetId <= 0) {
      this.petProfile = null;
      this.petLoading = false;
      return;
    }

    this.petLoading = true;
    this.petProfile = null;

    this.http
      .get<unknown>(`${this.petsApiUrl}/${normalizedPetId}`, { headers: this.userHeaders() })
      .pipe(
        finalize(() => {
          this.petLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (payload) => {
          this.petProfile = this.normalizePetProfile(payload, normalizedPetId);
        },
        error: () => {
          this.petProfile = null;
        }
      });
  }

  private extractPetRecord(plan: TravelPlan): Record<string, unknown> | null {
    const source = plan as unknown as Record<string, unknown>;
    const candidate = source['pet'];
    return candidate && typeof candidate === 'object'
      ? (candidate as Record<string, unknown>)
      : null;
  }

  private pickPetText(...candidates: unknown[]): string | null {
    for (const candidate of candidates) {
      const normalized = String(candidate ?? '').trim();
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private userHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-User-Id': this.travelPlanService.getCurrentUserId() });
  }

  private normalizePetProfile(value: unknown, fallbackPetId: number): PetProfile {
    const source = (value ?? {}) as Record<string, unknown>;

    return {
      id: Number(source['id'] ?? fallbackPetId),
      name: this.pickPetText(source['name']) ?? `Pet #${fallbackPetId}`,
      species: this.pickPetText(source['species']) ?? 'Unknown',
      breed: this.pickPetText(source['breed']) ?? 'Unknown breed',
      weight: Number(source['weight'] ?? 0),
      photoUrl: this.pickPetText(source['photoUrl']) ?? undefined,
      gender: this.pickPetText(source['gender']) ?? 'Unknown'
    };
  }

  private resolvePetImageUrl(...candidates: unknown[]): string | null {
    const normalized = this.pickPetText(...candidates);
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

    return `${this.backendHost}${this.backendContext}/${normalized}`;
  }

  private buildHeroImages(destination: TravelDestination): string[] {
    const images: string[] = [];

    const appendUnique = (imageUrl?: string): void => {
      const normalized = (imageUrl ?? '').trim();
      if (!normalized || images.includes(normalized)) {
        return;
      }

      images.push(normalized);
    };

    appendUnique(destination.coverImageUrl);
    (destination.carouselImages ?? []).forEach((image) => appendUnique(image.imageUrl));

    return images;
  }

  private destinationRequiredDocuments(): RequiredDocumentType[] {
    const required = this.destination?.requiredDocuments ?? [];

    return required
      .map((value) => String(value ?? '').trim().toUpperCase())
      .filter((value): value is RequiredDocumentType =>
        ['PET_PASSPORT', 'RABIES_VACCINE', 'HEALTH_CERTIFICATE', 'TRANSPORT_AUTHORIZATION'].includes(
          value
        )
      );
  }

  private buildDocumentRow(type: RequiredDocumentType): RequiredDocumentRow {
    const uploaded = this.findUploadedDocument(type);

    if (!uploaded) {
      return {
        type,
        label: this.documentLabelMap[type],
        icon: this.documentIconMap[type],
        state: 'NOT_UPLOADED',
        stateLabel: 'Not uploaded',
        stateIcon: 'remove_circle_outline',
        stateClass: 'doc-state-neutral'
      };
    }

    if (uploaded.validationStatus === 'VALIDATED') {
      return {
        type,
        label: this.documentLabelMap[type],
        icon: this.documentIconMap[type],
        state: 'VALIDATED',
        stateLabel: 'Validated',
        stateIcon: 'check_circle',
        stateClass: 'doc-state-success',
        fileName: uploaded.fileName
      };
    }

    if (uploaded.validationStatus === 'EXPIRED') {
      return {
        type,
        label: this.documentLabelMap[type],
        icon: this.documentIconMap[type],
        state: 'EXPIRED',
        stateLabel: 'Expired',
        stateIcon: 'event_busy',
        stateClass: 'doc-state-danger',
        fileName: uploaded.fileName
      };
    }

    if (uploaded.validationStatus === 'REJECTED') {
      return {
        type,
        label: this.documentLabelMap[type],
        icon: this.documentIconMap[type],
        state: 'REJECTED',
        stateLabel: 'Rejected',
        stateIcon: 'cancel',
        stateClass: 'doc-state-danger',
        fileName: uploaded.fileName
      };
    }

    if (uploaded.validationStatus === 'INCOMPLETE') {
      return {
        type,
        label: this.documentLabelMap[type],
        icon: this.documentIconMap[type],
        state: 'INCOMPLETE',
        stateLabel: 'Incomplete',
        stateIcon: 'warning',
        stateClass: 'doc-state-warning',
        fileName: uploaded.fileName
      };
    }

    return {
      type,
      label: this.documentLabelMap[type],
      icon: this.documentIconMap[type],
      state: 'PENDING',
      stateLabel: 'Under review',
      stateIcon: 'schedule',
      stateClass: 'doc-state-warning',
      fileName: uploaded.fileName
    };
  }

  private findUploadedDocument(type: RequiredDocumentType): TravelPlanDocument | null {
    const matches = this.uploadedDocuments.filter((document) => document.documentType === type);
    if (matches.length === 0) {
      return null;
    }

    return matches.sort((left, right) => {
      const leftDate = Date.parse(left.uploadedAt ?? '');
      const rightDate = Date.parse(right.uploadedAt ?? '');

      const leftTime = Number.isNaN(leftDate) ? 0 : leftDate;
      const rightTime = Number.isNaN(rightDate) ? 0 : rightDate;

      return rightTime - leftTime;
    })[0];
  }

  private documentsReadinessPoints(): number {
    const required = this.destinationRequiredDocuments();

    if (required.length === 0) {
      return TravelPlanDetailComponent.DOCUMENT_MAX_POINTS;
    }

    let weightedProgress = 0;

    required.forEach((requiredType) => {
      const document = this.findUploadedDocument(requiredType);
      weightedProgress += this.documentContribution(document?.validationStatus);
    });

    const normalized =
      (weightedProgress / required.length) * TravelPlanDetailComponent.DOCUMENT_MAX_POINTS;
    return this.roundToOne(normalized);
  }

  private checklistReadinessPoints(): number {
    if (!this.checklistStats) {
      return 0;
    }

    if (this.checklistStats.totalMandatory <= 0) {
      return TravelPlanDetailComponent.CHECKLIST_MAX_POINTS;
    }

    const mandatoryRatio = Math.min(
      100,
      Math.max(0, Number(this.checklistStats.mandatoryCompletionPercentage ?? 0))
    );

    return this.roundToOne((mandatoryRatio / 100) * TravelPlanDetailComponent.CHECKLIST_MAX_POINTS);
  }

  private petInfoReadinessPoints(plan: TravelPlan): number {
    const completedOptionalFields = this.optionalInfoCompletionCount(plan);
    return completedOptionalFields * TravelPlanDetailComponent.OPTIONAL_FIELD_POINTS;
  }

  private adminValidationReadinessPoints(plan: TravelPlan): number {
    return plan.status === 'APPROVED' || plan.status === 'COMPLETED'
      ? TravelPlanDetailComponent.ADMIN_VALIDATION_MAX_POINTS
      : 0;
  }

  private optionalInfoCompletionCount(plan: TravelPlan): number {
    const optionalFields: unknown[] = [
      plan.animalWeight,
      plan.cageLength,
      plan.cageWidth,
      plan.cageHeight
    ];

    return optionalFields.filter((field) => this.asPositiveOrNull(field) !== null).length;
  }

  private missingRequiredDocumentLabels(): string[] {
    return this.requiredDocumentRows
      .filter((row) =>
        ['NOT_UPLOADED', 'REJECTED', 'EXPIRED'].includes(row.state)
      )
      .map((row) => {
        if (row.state === 'REJECTED' || row.state === 'EXPIRED') {
          return `${row.label} (re-upload required)`;
        }

        return row.label;
      });
  }

  private checklistGapLabel(): string | null {
    if (this.checklistLoading) {
      return 'Mandatory checklist progress is still loading.';
    }

    if (!this.checklistStats) {
      return 'Incomplete mandatory checklist: progress not available yet.';
    }

    if (this.checklistStats.totalMandatory <= 0) {
      return null;
    }

    const completed = Number(this.checklistStats.completedMandatory ?? 0);
    const total = Number(this.checklistStats.totalMandatory ?? 0);
    const remaining = Math.max(0, total - completed);

    if (remaining <= 0) {
      return null;
    }

    return `Incomplete mandatory checklist: ${completed}/${total} completed.`;
  }

  private missingOptionalFieldLabels(plan: TravelPlan): string[] {
    const fields: Array<{ label: string; value: unknown }> = [
      { label: 'Animal Weight', value: plan.animalWeight },
      { label: 'Cage Length', value: plan.cageLength },
      { label: 'Cage Width', value: plan.cageWidth },
      { label: 'Cage Height', value: plan.cageHeight }
    ];

    return fields
      .filter((field) => this.asPositiveOrNull(field.value) === null)
      .map((field) => field.label);
  }

  private hasPendingOrIncompleteDocuments(): boolean {
    return this.requiredDocumentRows.some((row) =>
      row.state === 'PENDING' || row.state === 'INCOMPLETE'
    );
  }

  private hasRejectedDocuments(): boolean {
    return this.requiredDocumentRows.some((row) =>
      row.state === 'REJECTED' || row.state === 'EXPIRED'
    );
  }

  private allRequiredDocumentsUploaded(): boolean {
    return this.requiredDocumentRows.length > 0 && this.requiredDocumentRows.every((row) => row.state !== 'NOT_UPLOADED');
  }

  private documentContribution(status: TravelPlanDocument['validationStatus'] | undefined): number {
    if (status === 'VALIDATED' || status === 'PENDING' || status === 'INCOMPLETE') {
      return 1;
    }

    return 0;
  }

  private formatPoints(points: number, maxPoints: number): string {
    const normalized = this.roundToOne(points);
    const shown = Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(1);
    return `${shown}/${maxPoints} pts`;
  }

  private roundToOne(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private isReadyScore(score: number): boolean {
    return Number(score ?? 0) >= TravelPlanDetailComponent.SUBMIT_THRESHOLD;
  }

  private asPositiveOrNull(value: unknown): number | null {
    const normalized = Number(value ?? 0);
    if (Number.isNaN(normalized) || normalized <= 0) {
      return null;
    }

    return normalized;
  }
}
