import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  finalize,
  from,
  map,
  mergeMap,
  of,
  switchMap,
  takeUntil
} from 'rxjs';
import { TransportType, TravelPlanStatus, TravelPlanSummary } from '../../models/travel-plan.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';
import { TravelPlanService } from '../../services/travel-plan.service';

type PlanFilter = 'ALL' | 'IN_PREPARATION' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

type TransportChip = {
  icon: string;
  label: string;
};

type ResolvedPetProfile = {
  petId: number;
  name: string | null;
  breed: string | null;
  species: string | null;
  imageUrl: string | null;
};

@Component({
  selector: 'app-travel-plans-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, PaginationComponent],
  templateUrl: './travel-plans-list.component.html',
  styleUrl: './travel-plans-list.component.scss'
})
export class TravelPlansListComponent implements OnInit, OnDestroy {
  private readonly backendHost = 'http://localhost:8087';
  private readonly backendContext = '/elif';
  private readonly petsApiUrl = `${this.backendHost}${this.backendContext}/api/user-pets`;

  readonly filters: { value: PlanFilter; label: string }[] = [
    { value: 'ALL', label: 'All states' },
    { value: 'IN_PREPARATION', label: 'In Preparation' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'COMPLETED', label: 'Completed' }
  ];

  private readonly transportMap: Record<TransportType, TransportChip> = {
    CAR: { icon: 'directions_car', label: 'Car' },
    TRAIN: { icon: 'train', label: 'Train' },
    PLANE: { icon: 'flight', label: 'Plane' },
    BUS: { icon: 'directions_bus', label: 'Bus' }
  };

  plans: TravelPlanSummary[] = [];
  loading = true;
  deleting = false;
  errorMessage = '';

  activeFilter: PlanFilter = 'ALL';
  searchTerm = '';
  startDateFilter = '';
  endDateFilter = '';
  showFilters = false;
  pendingDeletePlan: TravelPlanSummary | null = null;
  planToCancel: TravelPlanSummary | null = null;
  showCancelDialog = false;
  currentPage = 1;
  itemsPerPage = 6;
  private readonly petNameById = new Map<number, string>();
  private readonly petProfileByPlanId = new Map<number, ResolvedPetProfile>();
  private petHydrationRunId = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly http: HttpClient,
    private readonly travelPlanService: TravelPlanService,
    readonly router: Router,
    private readonly toastService: PetTransitToastService
  ) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredPlans(): TravelPlanSummary[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.plans.filter((plan) => {
      const matchesStatus = this.activeFilter === 'ALL' || plan.status === this.activeFilter;
      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return this.matchesDateRange(plan.travelDate);
      }

      const searchableText = [
        plan.destinationTitle,
        plan.destinationCountry,
        plan.destinationRegion,
        plan.destinationType,
        this.petDisplayName(plan),
        this.petBreed(plan)
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ');

      return searchableText.includes(query) && this.matchesDateRange(plan.travelDate);
    });
  }

  get totalItems(): number {
    return this.filteredPlans.length;
  }

  get paginatedPlans(): TravelPlanSummary[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredPlans.slice(start, start + this.itemsPerPage);
  }

  get hasSearchTerm(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  get hasQuickFilters(): boolean {
    return (
      this.activeFilter !== 'ALL' ||
      this.hasSearchTerm ||
      Boolean(this.startDateFilter) ||
      Boolean(this.endDateFilter)
    );
  }

  setFilter(filter: PlanFilter): void {
    this.activeFilter = filter;
    this.currentPage = 1;
  }

  onSearchTermChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value ?? '';
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onStartDateFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.startDateFilter = String(target?.value ?? '').trim();
    this.currentPage = 1;
  }

  onEndDateFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.endDateFilter = String(target?.value ?? '').trim();
    this.currentPage = 1;
  }

  clearQuickFilters(): void {
    this.activeFilter = 'ALL';
    this.searchTerm = '';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.currentPage = 1;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isFilterActive(filter: PlanFilter): boolean {
    return this.activeFilter === filter;
  }

  trackByPlan(_: number, plan: TravelPlanSummary): number {
    return plan.id;
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

  readinessClass(score: number): string {
    if (score < 40) {
      return 'readiness-low';
    }

    if (score < 80) {
      return 'readiness-medium';
    }

    return 'readiness-high';
  }

  transportChip(transportType: TravelPlanSummary['transportType']): TransportChip | null {
    if (!transportType) {
      return null;
    }

    return this.transportMap[transportType] ?? null;
  }

  petDisplayName(plan: TravelPlanSummary): string {
    const hydratedProfile = this.petProfileByPlanId.get(plan.id);
    if (hydratedProfile?.name && !this.isGenericPetLabel(hydratedProfile.name)) {
      return hydratedProfile.name;
    }

    const explicitName = this.extractPetName(plan);
    if (explicitName && !this.isGenericPetLabel(explicitName)) {
      return explicitName;
    }

    const petId = this.resolvePlanPetId(plan);
    if (petId > 0) {
      const cachedName = this.petNameById.get(petId);
      if (cachedName && !this.isGenericPetLabel(cachedName)) {
        return cachedName;
      }

      return `Pet #${petId}`;
    }

    if (explicitName) {
      return explicitName;
    }

    return 'Pet profile';
  }

  petImageUrl(plan: TravelPlanSummary): string | null {
    const hydratedProfile = this.petProfileByPlanId.get(plan.id);
    if (hydratedProfile?.imageUrl) {
      return hydratedProfile.imageUrl;
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

  petBreed(plan: TravelPlanSummary): string | null {
    const hydratedProfile = this.petProfileByPlanId.get(plan.id);
    if (hydratedProfile?.breed) {
      return hydratedProfile.breed;
    }

    const pet = this.extractPetRecord(plan);
    const source = plan as unknown as Record<string, unknown>;
    return this.pickPetText(
      pet?.['breed'],
      source['petBreed']
    );
  }

  onPetImgError(event: Event): void {
    (event.target as HTMLImageElement).src = '/images/animals/cat.png';
  }

  petIndicator(plan: TravelPlanSummary): string {
    const petId = this.resolvePlanPetId(plan);
    if (petId > 0) {
      return `Pet #${petId}`;
    }

    return 'No pet profile';
  }

  openDetails(planId: number): void {
    this.router.navigate(['/app/transit/plans', planId]);
  }

  openDocuments(planId: number): void {
    const normalizedPlanId = Number(planId);
    console.log('[TravelPlansList] navigating to documents with planId:', normalizedPlanId);

    if (!Number.isFinite(normalizedPlanId) || normalizedPlanId <= 0) {
      this.toastService.error('Unable to open documents: invalid plan id.');
      return;
    }

    this.router.navigate(['/app/transit/plans', normalizedPlanId, 'documents']);
  }

  openCreate(): void {
    this.router.navigate(['/app/transit/destinations']);
  }

  openEdit(planId: number): void {
    this.router.navigate(['/app/transit/plans', planId, 'edit']);
  }

  canEdit(plan: TravelPlanSummary): boolean {
    return ['DRAFT', 'IN_PREPARATION', 'REJECTED'].includes(plan.status);
  }

  canCancel(plan: TravelPlanSummary): boolean {
    return ['SUBMITTED', 'APPROVED'].includes(plan.status);
  }

  canDelete(plan: TravelPlanSummary): boolean {
    return (
      ['DRAFT', 'IN_PREPARATION', 'REJECTED', 'CANCELLED'].includes(plan.status) ||
      (plan.status === 'COMPLETED' && !plan.hasFeedback)
    );
  }

  getDeleteTooltip(plan: TravelPlanSummary): string {
    if (plan.status === 'SUBMITTED' || plan.status === 'APPROVED') {
      return 'Cancel this plan first before deleting';
    }

    if (plan.status === 'COMPLETED' && plan.hasFeedback) {
      return 'Completed plans with feedback cannot be deleted';
    }

    return '';
  }

  openDestinations(): void {
    this.router.navigate(['/app/transit/destinations']);
  }

  goToFeedback(planId: number): void {
    this.router.navigate(['/app/transit/plans', planId, 'feedback', 'new']);
  }

  retryLoad(): void {
    this.loadPlans();
  }

  openDeleteDialog(plan: TravelPlanSummary): void {
    if (!this.canDelete(plan)) {
      return;
    }

    this.pendingDeletePlan = plan;
  }

  closeDeleteDialog(): void {
    this.pendingDeletePlan = null;
  }

  openCancelDialog(plan: TravelPlanSummary): void {
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
    if (!this.planToCancel) {
      return;
    }

    const cancelledPlanId = this.planToCancel.id;

    this.travelPlanService
      .cancelPlan(cancelledPlanId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showCancelDialog = false;
          this.planToCancel = null;
          this.toastService.success('Travel plan cancelled successfully.');
          this.loadPlans();
        },
        error: (error: unknown) => {
          this.toastService.error(
            error instanceof Error ? error.message : 'Could not cancel this plan.'
          );
        }
      });
  }

  confirmDelete(): void {
    if (!this.pendingDeletePlan) {
      return;
    }

    this.deleting = true;
    const planId = this.pendingDeletePlan.id;

    this.travelPlanService
      .deleteTravelPlan(planId)
      .pipe(
        finalize(() => {
          this.deleting = false;
          this.closeDeleteDialog();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.plans = this.plans.filter((p) => p.id !== planId);
          this.ensureCurrentPageInRange();
          this.toastService.success('Travel plan deleted successfully.');
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to delete this travel plan right now. Please try again.';
          this.toastService.error(message);
        }
      });
  }

  private extractPetRecord(plan: TravelPlanSummary): Record<string, unknown> | null {
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

  private extractPetName(plan: TravelPlanSummary): string | null {
    const pet = this.extractPetRecord(plan);
    const source = plan as unknown as Record<string, unknown>;
    return this.pickPetText(
      plan.petName,
      source['petDisplayName'],
      source['petProfileName'],
      source['pet_profile_name'],
      source['profilePetName'],
      pet?.['name'],
      pet?.['petName'],
      pet?.['profileName'],
      pet?.['fullName']
    );
  }

  private refreshPetNameCache(plans: TravelPlanSummary[]): void {
    this.petNameById.clear();

    plans.forEach((plan) => {
      const petId = Number(plan.petId ?? 0);
      if (!Number.isFinite(petId) || petId <= 0 || this.petNameById.has(petId)) {
        return;
      }

      const petName = this.extractPetName(plan);
      if (petName && !this.isGenericPetLabel(petName)) {
        this.petNameById.set(petId, petName);
      }
    });
  }

  private hydratePetProfiles(plans: TravelPlanSummary[], runId: number): void {
    const plansNeedingPetProfile = plans.filter((plan) => this.shouldHydratePetForPlan(plan));
    if (plansNeedingPetProfile.length === 0) {
      return;
    }

    from(plansNeedingPetProfile)
      .pipe(
        mergeMap((plan) => this.loadPetProfileForPlan(plan), 4),
        takeUntil(this.destroy$)
      )
      .subscribe(({ planId, profile }) => {
        if (runId !== this.petHydrationRunId || !profile) {
          return;
        }

        this.petProfileByPlanId.set(planId, profile);
        if (profile.name && !this.isGenericPetLabel(profile.name)) {
          this.petNameById.set(profile.petId, profile.name);
        }
      });
  }

  private shouldHydratePetForPlan(plan: TravelPlanSummary): boolean {
    if (this.petProfileByPlanId.has(plan.id)) {
      return false;
    }

    const explicitName = this.extractPetName(plan);
    if (explicitName && !this.isGenericPetLabel(explicitName)) {
      return false;
    }

    const petId = Number(plan.petId ?? 0);
    return !Number.isFinite(petId) || petId <= 0 || !this.petNameById.has(petId);
  }

  private loadPetProfileForPlan(
    plan: TravelPlanSummary
  ): Observable<{ planId: number; profile: ResolvedPetProfile | null }> {
    const directPetId = Number(plan.petId ?? 0);
    const petId$ =
      Number.isFinite(directPetId) && directPetId > 0
        ? of(directPetId)
        : this.travelPlanService.getTravelPlanById(plan.id).pipe(
            map((fullPlan) => Number(fullPlan.petId ?? 0)),
            catchError(() => of(0))
          );

    return petId$.pipe(
      switchMap((petId) => {
        if (!Number.isFinite(petId) || petId <= 0) {
          return of(null);
        }

        return this.fetchPetProfile(petId);
      }),
      map((profile) => ({ planId: plan.id, profile }))
    );
  }

  private fetchPetProfile(petId: number): Observable<ResolvedPetProfile | null> {
    const normalizedPetId = Number(petId);
    if (!Number.isFinite(normalizedPetId) || normalizedPetId <= 0) {
      return of(null);
    }

    return this.http
      .get<unknown>(`${this.petsApiUrl}/${normalizedPetId}`, { headers: this.userHeaders() })
      .pipe(
        map((payload) => this.normalizePetProfile(payload, normalizedPetId)),
        catchError(() => of(null))
      );
  }

  private normalizePetProfile(value: unknown, fallbackPetId: number): ResolvedPetProfile {
    const source = (value ?? {}) as Record<string, unknown>;
    const petId = Number(source['id'] ?? fallbackPetId);
    const normalizedPetId = Number.isFinite(petId) && petId > 0 ? petId : fallbackPetId;

    return {
      petId: normalizedPetId,
      name: this.pickPetText(
        source['name'],
        source['petName'],
        source['profileName'],
        source['fullName']
      ),
      breed: this.pickPetText(source['breed']),
      species: this.pickPetText(source['species']),
      imageUrl: this.resolvePetImageUrl(
        source['photoUrl'],
        source['imageUrl'],
        source['profilePhoto'],
        source['avatarUrl']
      )
    };
  }

  private userHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-User-Id': this.travelPlanService.getCurrentUserId() });
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

  private resolvePlanPetId(plan: TravelPlanSummary): number {
    const fromSummary = Number(plan.petId ?? 0);
    if (Number.isFinite(fromSummary) && fromSummary > 0) {
      return fromSummary;
    }

    const fromHydratedProfile = Number(this.petProfileByPlanId.get(plan.id)?.petId ?? 0);
    if (Number.isFinite(fromHydratedProfile) && fromHydratedProfile > 0) {
      return fromHydratedProfile;
    }

    return 0;
  }

  private isGenericPetLabel(value: string): boolean {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return true;
    }

    const lowered = normalized.toLowerCase();
    if (
      lowered === 'unknown pet' ||
      lowered === 'pet profile' ||
      lowered === 'no pet profile' ||
      lowered === 'unnamed pet'
    ) {
      return true;
    }

    return /^pet\s*#\s*\d+$/i.test(normalized);
  }

  private matchesDateRange(dateValue?: string): boolean {
    if (!this.startDateFilter && !this.endDateFilter) {
      return true;
    }

    const normalizedDate = this.toDateOnly(dateValue);
    if (!normalizedDate) {
      return false;
    }

    if (this.startDateFilter && normalizedDate < this.startDateFilter) {
      return false;
    }

    if (this.endDateFilter && normalizedDate > this.endDateFilter) {
      return false;
    }

    return true;
  }

  private toDateOnly(value?: string): string {
    const parsed = Date.parse(String(value ?? ''));
    if (Number.isNaN(parsed)) {
      return '';
    }

    return new Date(parsed).toISOString().slice(0, 10);
  }

  private loadPlans(): void {
    this.loading = true;
    this.errorMessage = '';

    this.travelPlanService
      .getMyTravelPlans()
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (plans) => {
          this.petHydrationRunId += 1;
          const runId = this.petHydrationRunId;
          this.petProfileByPlanId.clear();
          this.plans = plans;
          this.currentPage = 1;
          this.refreshPetNameCache(plans);
          this.hydratePetProfiles(plans, runId);
        },
        error: (error: unknown) => {
          const isSessionMissing = !this.travelPlanService.getCurrentUserId();
          this.errorMessage = isSessionMissing
            ? 'Your session is missing. Please sign in again and retry.'
            : error instanceof Error
              ? error.message
              : 'Unable to load your travel plans right now.';
          this.toastService.error(this.errorMessage);
        }
      });
  }

  private ensureCurrentPageInRange(): void {
    const count = this.totalItems;
    if (count === 0) {
      this.currentPage = 1;
      return;
    }

    const maxPage = Math.ceil(count / this.itemsPerPage);
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
  }
}

