import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { finalize, take } from 'rxjs';
import { TransitConfirmationDialogComponent } from '../../components/transit-confirmation-dialog/transit-confirmation-dialog.component';
import { TransitToastContainerComponent } from '../../components/transit-toast-container/transit-toast-container.component';
import { TransitConfirmationDialogService } from '../../services/transit-confirmation-dialog.service';
import { TransitToastService } from '../../services/transit-toast.service';
import {
  TravelPlanStatus,
  TravelPlanSummary
} from '../../models/travel-plan-admin.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TravelPlanAdminService } from '../../services/travel-plan-admin.service';
import { TransitExportService } from '../../services/transit-export.service';

type PlanFilter =
  | 'ALL'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

@Component({
  selector: 'app-travel-plans-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    TransitToastContainerComponent,
    TransitConfirmationDialogComponent,
    PaginationComponent
  ],
  templateUrl: './travel-plans-admin.component.html',
  styleUrl: './travel-plans-admin.component.scss'
})
export class TravelPlansAdminComponent implements OnInit {
  readonly filters: PlanFilter[] = ['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED'];

  readonly skeletonRows = [1, 2, 3, 4];

  plans: TravelPlanSummary[] = [];
  loading = true;
  errorMessage = '';
  activeFilter: PlanFilter = 'ALL';

  searchTerm = '';
  startDateFilter = '';
  endDateFilter = '';
  showFilters = false;
  exportingPdf = false;
  exportingExcel = false;
  currentPage = 1;
  itemsPerPage = 9;

  removingPlanId: number | null = null;

  constructor(
    private readonly router: Router,
    private readonly travelPlanAdminService: TravelPlanAdminService,
    private readonly transitExportService: TransitExportService,
    private readonly transitToastService: TransitToastService,
    private readonly confirmationDialogService: TransitConfirmationDialogService
  ) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  get filteredPlans(): TravelPlanSummary[] {
    const keyword = this.searchTerm.trim().toLowerCase();

    const filtered = this.plans.filter((plan) => {
      const statusMatches = this.activeFilter === 'ALL' || plan.status === this.activeFilter;
      const searchMatches = this.matchesSearch(plan, keyword);
      const dateMatches = this.matchesDate(plan);

      return statusMatches && searchMatches && dateMatches;
    });

    return [...filtered].sort((left, right) => this.comparePlans(left, right));
  }

  get totalItems(): number {
    return this.filteredPlans.length;
  }

  get paginatedPlans(): TravelPlanSummary[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredPlans.slice(start, start + this.itemsPerPage);
  }

  get totalPlans(): number {
    return this.plans.length;
  }

  get submittedCount(): number {
    return this.plans.filter((plan) => plan.status === 'SUBMITTED').length;
  }

  get approvedCount(): number {
    return this.plans.filter((plan) => plan.status === 'APPROVED').length;
  }

  get hasQuickFilters(): boolean {
    return Boolean(this.searchTerm.trim()) || Boolean(this.startDateFilter) || Boolean(this.endDateFilter);
  }

  setFilter(filter: PlanFilter): void {
    this.activeFilter = filter;
    this.currentPage = 1;
  }

  isFilterActive(filter: PlanFilter): boolean {
    return this.activeFilter === filter;
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchTerm = target?.value ?? '';
    this.currentPage = 1;
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

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  clearQuickFilters(): void {
    this.searchTerm = '';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.currentPage = 1;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  exportFilteredPlansPdf(): void {
    if (this.exportingPdf) {
      return;
    }

    this.exportingPdf = true;
    this.transitExportService
      .exportTravelPlansPdf(this.currentExportFilters())
      .pipe(finalize(() => (this.exportingPdf = false)))
      .subscribe({
        next: () => {
          this.transitToastService.success('Export ready', 'Travel plans PDF exported successfully.');
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unable to export travel plans PDF.';
          this.transitToastService.error('Export failed', message);
        }
      });
  }

  exportFilteredPlansExcel(): void {
    if (this.exportingExcel) {
      return;
    }

    this.exportingExcel = true;
    this.transitExportService
      .exportTravelPlansExcel(this.currentExportFilters())
      .pipe(finalize(() => (this.exportingExcel = false)))
      .subscribe({
        next: () => {
          this.transitToastService.success('Export ready', 'Travel plans Excel exported successfully.');
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unable to export travel plans Excel.';
          this.transitToastService.error('Export failed', message);
        }
      });
  }

  openDetails(planId: number): void {
    this.router.navigate(['/admin/transit/travel-plans', planId]);
  }

  removeFromAdmin(plan: TravelPlanSummary): void {
    if (!plan?.id || this.removingPlanId !== null || !this.canDeletePlan(plan)) {
      return;
    }

    this.confirmationDialogService
      .confirm({
        title: `Delete "${plan.destinationTitle}" travel plan?`,
        message: `This action will permanently remove the travel plan for ${plan.ownerName}'s destination to ${plan.destinationTitle}. This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        tone: 'danger'
      })
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.executeRemove(plan);
      });
  }

  isRemoving(planId: number): boolean {
    return this.removingPlanId === planId;
  }

  canDeletePlan(plan: TravelPlanSummary): boolean {
    return !(plan.status === 'COMPLETED' && plan.hasFeedback);
  }

  getAdminDeleteTooltip(plan: TravelPlanSummary): string {
    if (plan.status === 'COMPLETED' && plan.hasFeedback) {
      return 'Completed plans with feedback cannot be deleted';
    }

    return '';
  }

  retry(): void {
    this.loadPlans();
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

  filterLabel(filter: PlanFilter): string {
    if (filter === 'ALL') {
      return 'All';
    }

    return this.statusLabel(filter as TravelPlanStatus);
  }

  statusClass(status: TravelPlanStatus): string {
    return `status-${String(status).toLowerCase()}`;
  }

  accentClass(status: TravelPlanStatus): string {
    return `accent-${String(status).toLowerCase()}`;
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

  initials(name: string): string {
    const chunks = String(name ?? '')
      .trim()
      .split(/\s+/)
      .filter((item) => item.length > 0);

    if (chunks.length === 0) {
      return 'NA';
    }

    if (chunks.length === 1) {
      return chunks[0].slice(0, 2).toUpperCase();
    }

    return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
  }

  formatDate(value?: string): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return 'Date not set';
    }

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return normalized;
    }

    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
  }

  emptySubtitle(): string {
    if (this.hasQuickFilters) {
      return 'No travel plans match your current search or date filters.';
    }

    if (this.activeFilter === 'ALL') {
      return 'No travel plans are available right now.';
    }

    return `No ${this.filterLabel(this.activeFilter)} plans found.`;
  }

  private loadPlans(): void {
    this.loading = true;
    this.errorMessage = '';

    this.travelPlanAdminService
      .getAllPlans()
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (plans) => {
          this.plans = plans;
          this.currentPage = 1;
          this.hydratePetNames(plans);
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'Unable to load travel plans right now. Please try again.';
          this.transitToastService.error('Loading failed', this.errorMessage);
        }
      });
  }

  private executeRemove(plan: TravelPlanSummary): void {
    this.removingPlanId = plan.id;

    this.travelPlanAdminService
      .removeFromAdminView(plan.id)
      .pipe(
        finalize(() => {
          this.removingPlanId = null;
        })
      )
      .subscribe({
        next: () => {
          this.plans = this.plans.filter((item) => item.id !== plan.id);
          this.ensureCurrentPageInRange();
          this.transitToastService.success('Travel plan deleted', `The travel plan for ${plan.ownerName}'s destination to ${plan.destinationTitle} was successfully deleted.`);
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to delete this travel plan right now.';
          this.transitToastService.error('Delete failed', message);
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

  private comparePlans(left: TravelPlanSummary, right: TravelPlanSummary): number {
    if (this.activeFilter === 'ALL') {
      const statusPriority: Record<TravelPlanStatus, number> = {
        SUBMITTED: 0,
        APPROVED: 1,
        IN_PREPARATION: 2,
        DRAFT: 3,
        REJECTED: 4,
        COMPLETED: 5,
        CANCELLED: 6
      };

      const leftPriority = statusPriority[left.status] ?? 99;
      const rightPriority = statusPriority[right.status] ?? 99;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
    }

    return this.toTimestamp(right.createdAt) - this.toTimestamp(left.createdAt);
  }

  private matchesSearch(plan: TravelPlanSummary, keyword: string): boolean {
    if (!keyword) {
      return true;
    }

    const searchPool = [
      plan.ownerName,
      plan.petName,
      plan.destinationTitle,
      plan.destinationCountry,
      plan.origin,
      plan.transportType,
      this.statusLabel(plan.status),
      plan.petId ? `pet ${plan.petId}` : ''
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ');

    return searchPool.includes(keyword);
  }

  private hydratePetNames(plans: TravelPlanSummary[]): void {
    const petIds = [...new Set(plans.filter((plan) => plan.petId > 0 && !plan.petName).map((plan) => plan.petId))];
    if (petIds.length === 0) {
      return;
    }

    this.travelPlanAdminService
      .getPetNamesByIds(petIds)
      .pipe(take(1))
      .subscribe({
        next: (petNamesById) => {
          this.plans = this.plans.map((plan) => ({
            ...plan,
            petName: plan.petName || petNamesById[plan.petId] || undefined
          }));
        },
        error: () => {
          // Keep fallback "Pet #id" labels when pet lookup is unavailable.
        }
      });
  }

  private matchesDate(plan: TravelPlanSummary): boolean {
    if (!this.startDateFilter && !this.endDateFilter) {
      return true;
    }

    const travelDate = this.toDateOnly(plan.travelDate);
    if (!travelDate) {
      return false;
    }

    if (this.startDateFilter && travelDate < this.startDateFilter) {
      return false;
    }

    if (this.endDateFilter && travelDate > this.endDateFilter) {
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

  private toTimestamp(value?: string): number {
    const parsed = Date.parse(String(value ?? ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private currentExportFilters(): {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    appliedFilters?: string;
  } {
    const filterParts: string[] = [];

    if (this.activeFilter !== 'ALL') {
      filterParts.push(`Status = ${this.filterLabel(this.activeFilter)}`);
    }

    if (this.searchTerm.trim()) {
      filterParts.push(`Search = ${this.searchTerm.trim()}`);
    }

    if (this.startDateFilter.trim()) {
      filterParts.push(`Start Date = ${this.startDateFilter.trim()}`);
    }

    if (this.endDateFilter.trim()) {
      filterParts.push(`End Date = ${this.endDateFilter.trim()}`);
    }

    return {
      status: this.activeFilter === 'ALL' ? undefined : this.activeFilter,
      search: this.searchTerm.trim() || undefined,
      startDate: this.startDateFilter.trim() || undefined,
      endDate: this.endDateFilter.trim() || undefined,
      appliedFilters: filterParts.join(' | ') || undefined
    };
  }
}
