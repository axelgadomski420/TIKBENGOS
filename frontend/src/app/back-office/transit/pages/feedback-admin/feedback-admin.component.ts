import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, take } from 'rxjs';
import { FeedbackRespondModalComponent } from '../../components/feedback-respond-modal/feedback-respond-modal.component';
import { TransitConfirmationDialogComponent } from '../../components/transit-confirmation-dialog/transit-confirmation-dialog.component';
import { TransitToastContainerComponent } from '../../components/transit-toast-container/transit-toast-container.component';
import {
  AdminFeedbackResponseRequest,
  FEEDBACK_TYPE_CONFIG,
  FeedbackType,
  PROCESSING_CONFIG,
  ProcessingStatus,
  TravelFeedbackAdmin
} from '../../models/travel-feedback-admin.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TransitConfirmationDialogService } from '../../services/transit-confirmation-dialog.service';
import { TransitToastService } from '../../services/transit-toast.service';
import { TravelFeedbackAdminService } from '../../services/travel-feedback-admin.service';
import { TravelPlanAdminService } from '../../services/travel-plan-admin.service';
import { TransitExportService } from '../../services/transit-export.service';

type FeedbackTypeFilter = 'ALL' | FeedbackType;
type StatusFilter = 'ALL' | ProcessingStatus;

@Component({
  selector: 'app-feedback-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    RouterLink,
    TransitToastContainerComponent,
    TransitConfirmationDialogComponent,
    FeedbackRespondModalComponent,
    PaginationComponent
  ],
  templateUrl: './feedback-admin.component.html',
  styleUrl: './feedback-admin.component.scss'
})
export class FeedbackAdminComponent implements OnInit {
  readonly typeFilters: FeedbackTypeFilter[] = [
    'ALL',
    'REVIEW',
    'SUGGESTION',
    'INCIDENT',
    'COMPLAINT'
  ];
  readonly statusFilters: StatusFilter[] = ['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  readonly skeletonRows = [1, 2, 3, 4];

  readonly typeConfig = FEEDBACK_TYPE_CONFIG;
  readonly processingConfig = PROCESSING_CONFIG;

  feedbacks: TravelFeedbackAdmin[] = [];
  loading = true;
  errorMessage = '';

  searchTerm = '';
  activeTypeFilter: FeedbackTypeFilter = 'ALL';
  activeStatusFilter: StatusFilter = 'ALL';
  startDateFilter = '';
  endDateFilter = '';
  showFilters = false;
  exportingPdf = false;
  exportingExcel = false;
  currentPage = 1;
  itemsPerPage = 9;

  respondingFeedback: TravelFeedbackAdmin | null = null;
  viewingFeedback: TravelFeedbackAdmin | null = null;
  submittingResponse = false;
  deletingFeedbackId: number | null = null;

  constructor(
    private readonly feedbackAdminService: TravelFeedbackAdminService,
    private readonly travelPlanAdminService: TravelPlanAdminService,
    private readonly transitExportService: TransitExportService,
    private readonly transitToastService: TransitToastService,
    private readonly confirmationDialogService: TransitConfirmationDialogService
  ) {}

  ngOnInit(): void {
    this.loadFeedbacks();
  }

  get filteredFeedbacks(): TravelFeedbackAdmin[] {
    const keyword = this.searchTerm.trim().toLowerCase();

    return this.feedbacks.filter((feedback) => {
      const byKeyword = this.matchesSearch(feedback, keyword);
      const byType = this.matchesTypeFilter(feedback);
      const byStatus = this.activeStatusFilter === 'ALL' || feedback.processingStatus === this.activeStatusFilter;
      const byDate = this.matchesDateRange(feedback.createdAt);
      return byKeyword && byType && byStatus && byDate;
    });
  }

  get totalItems(): number {
    return this.filteredFeedbacks.length;
  }

  get paginatedFeedbacks(): TravelFeedbackAdmin[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredFeedbacks.slice(start, start + this.itemsPerPage);
  }

  get totalCount(): number {
    return this.feedbacks.length;
  }

  get pendingCount(): number {
    return this.feedbacks.filter((feedback) => feedback.processingStatus === 'PENDING').length;
  }

  get resolvedCount(): number {
    return this.feedbacks.filter((feedback) => feedback.processingStatus === 'RESOLVED').length;
  }

  get hasFiltersApplied(): boolean {
    return (
      Boolean(this.searchTerm.trim()) ||
      this.activeTypeFilter !== 'ALL' ||
      this.activeStatusFilter !== 'ALL' ||
      Boolean(this.startDateFilter) ||
      Boolean(this.endDateFilter)
    );
  }

  setTypeFilter(filter: FeedbackTypeFilter): void {
    this.activeTypeFilter = filter;
    this.currentPage = 1;
  }

  setStatusFilter(filter: StatusFilter): void {
    this.activeStatusFilter = filter;
    this.currentPage = 1;
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchTerm = target?.value ?? '';
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

  clearFilters(): void {
    this.searchTerm = '';
    this.activeTypeFilter = 'ALL';
    this.activeStatusFilter = 'ALL';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.currentPage = 1;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  exportFilteredFeedbackPdf(): void {
    if (this.exportingPdf) {
      return;
    }

    this.exportingPdf = true;
    this.transitExportService
      .exportFeedbackPdf(this.currentExportFilters())
      .pipe(finalize(() => (this.exportingPdf = false)))
      .subscribe({
        next: () => {
          this.transitToastService.success('Export ready', 'Feedback PDF exported successfully.');
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unable to export feedback PDF.';
          this.transitToastService.error('Export failed', message);
        }
      });
  }

  exportFilteredFeedbackExcel(): void {
    if (this.exportingExcel) {
      return;
    }

    this.exportingExcel = true;
    this.transitExportService
      .exportFeedbackExcel(this.currentExportFilters())
      .pipe(finalize(() => (this.exportingExcel = false)))
      .subscribe({
        next: () => {
          this.transitToastService.success('Export ready', 'Feedback Excel exported successfully.');
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unable to export feedback Excel.';
          this.transitToastService.error('Export failed', message);
        }
      });
  }

  canRespond(feedback: TravelFeedbackAdmin): boolean {
    const type = feedback.feedbackType;
    return type !== 'REVIEW' && feedback.processingStatus !== 'CLOSED';
  }

  canDelete(feedback: TravelFeedbackAdmin): boolean {
    return feedback.processingStatus !== 'RESOLVED' && feedback.processingStatus !== 'CLOSED';
  }

  deleteTooltip(feedback: TravelFeedbackAdmin): string {
    if (this.canDelete(feedback)) {
      return '';
    }

    return 'Cannot delete resolved or closed feedback.';
  }

  openRespondModal(feedback: TravelFeedbackAdmin): void {
    if (!this.canRespond(feedback) || this.submittingResponse) {
      return;
    }

    this.viewingFeedback = null;
    this.respondingFeedback = feedback;
  }

  closeRespondModal(): void {
    if (this.submittingResponse) {
      return;
    }

    this.respondingFeedback = null;
  }

  openDetailsModal(feedback: TravelFeedbackAdmin): void {
    this.respondingFeedback = null;
    this.viewingFeedback = feedback;
  }

  closeDetailsModal(): void {
    this.viewingFeedback = null;
  }

  submitResponse(request: AdminFeedbackResponseRequest): void {
    const current = this.respondingFeedback;
    if (!current || this.submittingResponse) {
      return;
    }

    this.submittingResponse = true;

    this.feedbackAdminService
      .respondToFeedback(current.id, request)
      .pipe(
        finalize(() => {
          this.submittingResponse = false;
        })
      )
      .subscribe({
        next: () => {
          this.transitToastService.success('Response sent', 'Response sent successfully.');
          this.respondingFeedback = null;
          this.loadFeedbacks();
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to send response right now. Please try again.';
          this.transitToastService.error('Response failed', message);
        }
      });
  }

  deleteFeedback(feedback: TravelFeedbackAdmin): void {
    if (!feedback.id || this.deletingFeedbackId !== null || !this.canDelete(feedback)) {
      return;
    }

    this.confirmationDialogService
      .confirm({
        title: 'Delete Feedback',
        message: 'Are you sure you want to delete this feedback? This action cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        tone: 'danger'
      })
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.executeDelete(feedback);
      });
  }

  retry(): void {
    this.loadFeedbacks();
  }

  typeFilterLabel(filter: FeedbackTypeFilter): string {
    switch (filter) {
      case 'REVIEW':
        return 'Reviews';
      case 'SUGGESTION':
        return 'Suggestions';
      case 'INCIDENT':
        return 'Incidents';
      case 'COMPLAINT':
        return 'Complaints';
      case 'ALL':
      default:
        return 'All';
    }
  }

  statusFilterLabel(filter: StatusFilter): string {
    if (filter === 'ALL') {
      return 'All';
    }

    return this.processingConfig[filter].label;
  }

  statusClass(status: ProcessingStatus): string {
    return `status-${status.toLowerCase()}`;
  }

  typeClass(type: FeedbackType): string {
    return `type-${type.toLowerCase()}`;
  }

  isDeleteLoading(feedbackId: number): boolean {
    return this.deletingFeedbackId === feedbackId;
  }

  initials(name?: string): string {
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

  displayOwnerName(feedback: TravelFeedbackAdmin): string {
    return String(feedback.ownerName ?? '').trim() || `Client #${feedback.travelPlanId}`;
  }

  formatDate(value?: string): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return 'Not available';
    }

    const parsed = Date.parse(normalized);
    if (Number.isNaN(parsed)) {
      return normalized;
    }

    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(parsed));
  }

  formatDateTime(value?: string): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return 'Not available';
    }

    const parsed = Date.parse(normalized);
    if (Number.isNaN(parsed)) {
      return normalized;
    }

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(parsed));
  }

  emptySubtitle(): string {
    if (this.hasFiltersApplied) {
      return 'No feedbacks match your current search and filters.';
    }

    return 'No feedback has been submitted yet.';
  }

  trackByFeedback(_: number, feedback: TravelFeedbackAdmin): number {
    return feedback.id;
  }

  private loadFeedbacks(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      feedbacks: this.feedbackAdminService.getAllFeedbacks(),
      plans: this.travelPlanAdminService.getAllPlans()
    })
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: ({ feedbacks, plans }) => {
          const ownerByPlanId = new Map<number, string>();
          for (const plan of plans) {
            const owner = String(plan.ownerName ?? '').trim();
            if (!owner) {
              continue;
            }
            ownerByPlanId.set(plan.id, owner);
          }

          this.feedbacks = feedbacks.map((feedback) => ({
            ...feedback,
            ownerName:
              String(feedback.ownerName ?? '').trim() ||
              ownerByPlanId.get(feedback.travelPlanId) ||
              `Client #${feedback.travelPlanId}`
          }));
          this.currentPage = 1;
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'Unable to load travel feedback right now. Please try again.';
          this.transitToastService.error('Loading failed', this.errorMessage);
        }
      });
  }

  private executeDelete(feedback: TravelFeedbackAdmin): void {
    this.deletingFeedbackId = feedback.id;

    this.feedbackAdminService
      .deleteFeedback(feedback.travelPlanId, feedback.id)
      .pipe(
        finalize(() => {
          this.deletingFeedbackId = null;
        })
      )
      .subscribe({
        next: () => {
          this.feedbacks = this.feedbacks.filter((item) => item.id !== feedback.id);
          this.ensureCurrentPageInRange();
          this.transitToastService.success('Feedback deleted', 'Feedback deleted successfully.');
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to delete this feedback right now.';
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

  private matchesTypeFilter(feedback: TravelFeedbackAdmin): boolean {
    if (this.activeTypeFilter === 'ALL') {
      return true;
    }

    return feedback.feedbackType === this.activeTypeFilter;
  }

  private matchesSearch(feedback: TravelFeedbackAdmin, keyword: string): boolean {
    if (!keyword) {
      return true;
    }

    const pool = [
      feedback.destinationTitle,
      feedback.ownerName,
      feedback.feedbackType,
      feedback.message,
      feedback.title
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ');

    return pool.includes(keyword);
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

  private currentExportFilters(): {
    type?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    appliedFilters?: string;
  } {
    const filterParts: string[] = [];

    if (this.activeTypeFilter !== 'ALL') {
      filterParts.push(`Type = ${this.typeFilterLabel(this.activeTypeFilter)}`);
    }

    if (this.activeStatusFilter !== 'ALL') {
      filterParts.push(`Status = ${this.statusFilterLabel(this.activeStatusFilter)}`);
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
      type: this.activeTypeFilter === 'ALL' ? undefined : this.activeTypeFilter,
      status: this.activeStatusFilter === 'ALL' ? undefined : this.activeStatusFilter,
      search: this.searchTerm.trim() || undefined,
      startDate: this.startDateFilter.trim() || undefined,
      endDate: this.endDateFilter.trim() || undefined,
      appliedFilters: filterParts.join(' | ') || undefined
    };
  }

}
