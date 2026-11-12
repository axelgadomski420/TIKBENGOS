import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { EditFeedbackModalComponent } from '../../components/edit-feedback-modal/edit-feedback-modal.component';
import { FeedbackDetailsModalComponent } from '../../components/feedback-details-modal/feedback-details-modal.component';
import {
  FEEDBACK_TYPE_CONFIG,
  FeedbackType,
  PROCESSING_STATUS_CONFIG,
  ProcessingStatus,
  TravelFeedback
} from '../../models/travel-feedback.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';
import { TravelFeedbackService } from '../../services/travel-feedback.service';

type FeedbackFilter = 'ALL' | FeedbackType;
type FeedbackStatusFilter = 'ALL' | ProcessingStatus;

@Component({
  selector: 'app-my-feedbacks',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    PaginationComponent,
    EditFeedbackModalComponent,
    FeedbackDetailsModalComponent
  ],
  templateUrl: './my-feedbacks.component.html',
  styleUrl: './my-feedbacks.component.scss'
})
export class MyFeedbacksComponent implements OnInit, OnDestroy {
  feedbacks: TravelFeedback[] = [];
  loading = true;
  errorMessage = '';

  searchTerm = '';
  activeTypeFilter: FeedbackFilter = 'ALL';
  activeStatusFilter: FeedbackStatusFilter = 'ALL';
  startDateFilter = '';
  endDateFilter = '';
  showFilters = false;
  currentPage = 1;
  itemsPerPage = 8;

  pendingDeleteId: number | null = null;
  pendingDeletePlanId: number | null = null;
  deleting = false;

  feedbackToEdit: TravelFeedback | null = null;
  feedbackToView: TravelFeedback | null = null;

  readonly filterOptions: { value: FeedbackFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'REVIEW', label: 'Reviews' },
    { value: 'SUGGESTION', label: 'Suggestions' },
    { value: 'INCIDENT', label: 'Incidents' },
    { value: 'COMPLAINT', label: 'Complaints' }
  ];
  readonly statusFilterOptions: { value: FeedbackStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All states' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'CLOSED', label: 'Closed' }
  ];

  readonly typeConfig = FEEDBACK_TYPE_CONFIG;
  readonly statusConfig = PROCESSING_STATUS_CONFIG;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly feedbackService: TravelFeedbackService,
    private readonly toastService: PetTransitToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadFeedbacks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredFeedbacks(): TravelFeedback[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.feedbacks.filter((feedback) => {
      const typeMatches =
        this.activeTypeFilter === 'ALL' || feedback.feedbackType === this.activeTypeFilter;
      const statusMatches =
        this.activeStatusFilter === 'ALL' || feedback.processingStatus === this.activeStatusFilter;
      const dateMatches = this.matchesDateRange(feedback.createdAt);
      const searchMatches =
        !query ||
        [
          feedback.destinationTitle,
          feedback.title,
          feedback.message,
          feedback.feedbackType,
          feedback.processingStatus
        ]
          .map((value) => String(value ?? '').toLowerCase())
          .join(' ')
          .includes(query);

      return typeMatches && statusMatches && dateMatches && searchMatches;
    });
  }

  get totalItems(): number {
    return this.filteredFeedbacks.length;
  }

  get paginatedFeedbacks(): TravelFeedback[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredFeedbacks.slice(start, start + this.itemsPerPage);
  }

  get totalCount(): number {
    return this.feedbacks.length;
  }

  get reviewCount(): number {
    return this.feedbacks.filter((feedback) => feedback.feedbackType === 'REVIEW').length;
  }

  get complaintsIncidentsCount(): number {
    return this.feedbacks.filter(
      (feedback) => feedback.feedbackType === 'COMPLAINT' || feedback.feedbackType === 'INCIDENT'
    ).length;
  }

  get pendingResponseCount(): number {
    return this.feedbacks.filter(
      (feedback) =>
        feedback.processingStatus === 'PENDING' || feedback.processingStatus === 'IN_PROGRESS'
    ).length;
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

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchTerm = target?.value ?? '';
    this.currentPage = 1;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  setTypeFilter(filter: FeedbackFilter): void {
    this.activeTypeFilter = filter;
    this.currentPage = 1;
  }

  setStatusFilter(filter: FeedbackStatusFilter): void {
    this.activeStatusFilter = filter;
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

  openEditModal(feedback: TravelFeedback): void {
    this.feedbackToEdit = feedback;
  }

  openDetailsModal(feedback: TravelFeedback): void {
    this.feedbackToView = feedback;
  }

  closeDetailsModal(): void {
    this.feedbackToView = null;
  }

  closeEditModal(): void {
    this.feedbackToEdit = null;
  }

  onFeedbackUpdated(): void {
    this.closeEditModal();
    this.loadFeedbacks();
    this.toastService.success('Feedback updated successfully.');
  }

  openDeleteConfirm(feedbackId: number, planId: number): void {
    this.pendingDeleteId = feedbackId;
    this.pendingDeletePlanId = planId;
  }

  canDeleteFeedback(feedback: TravelFeedback): boolean {
    return (
      !feedback.adminResponse &&
      feedback.processingStatus !== 'RESOLVED' &&
      feedback.processingStatus !== 'CLOSED'
    );
  }

  getFeedbackDeleteTooltip(feedback: TravelFeedback): string {
    if (feedback.adminResponse) {
      return 'Cannot delete — admin has responded';
    }

    if (feedback.processingStatus === 'RESOLVED' || feedback.processingStatus === 'CLOSED') {
      return 'Cannot delete resolved feedback';
    }

    return '';
  }

  closeDeleteConfirm(): void {
    this.pendingDeleteId = null;
    this.pendingDeletePlanId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId === null || this.pendingDeletePlanId === null) {
      return;
    }

    const feedbackId = this.pendingDeleteId;
    const planId = this.pendingDeletePlanId;
    this.deleting = true;

    this.feedbackService
      .deleteFeedback(planId, feedbackId)
      .pipe(
        finalize(() => {
          this.deleting = false;
          this.closeDeleteConfirm();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.feedbacks = this.feedbacks.filter((feedback) => feedback.id !== feedbackId);
          this.ensureCurrentPageInRange();
          this.toastService.success('Feedback deleted.');
        },
        error: (error: Error) => {
          this.toastService.error(error.message || 'Failed to delete feedback.');
        }
      });
  }

  starsArray(rating: number): number[] {
    const normalizedRating = Math.round(Math.max(0, Math.min(5, rating)));
    return Array.from({ length: normalizedRating }, (_, index) => index);
  }

  emptyStarsArray(rating: number): number[] {
    const normalizedRating = Math.round(Math.max(0, Math.min(5, rating)));
    return Array.from({ length: 5 - normalizedRating }, (_, index) => index);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) {
      return '';
    }

    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  trackByFeedback(_: number, feedback: TravelFeedback): number {
    return feedback.id;
  }

  goToMyTrips(): void {
    this.router.navigate(['/app/transit/plans/my']);
  }

  getStatusClass(status: ProcessingStatus): string {
    const classMap: Record<ProcessingStatus, string> = {
      PENDING: 'status-pending',
      IN_PROGRESS: 'status-in-progress',
      RESOLVED: 'status-resolved',
      CLOSED: 'status-closed'
    };

    return classMap[status] ?? '';
  }

  typeRgb(type: FeedbackType): string {
    const hex = this.typeConfig[type].color.replace('#', '');
    const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const value = Number.parseInt(normalized, 16);

    if (Number.isNaN(value)) {
      return '67,160,71';
    }

    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;

    return `${red}, ${green}, ${blue}`;
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

  private loadFeedbacks(): void {
    this.loading = true;
    this.errorMessage = '';

    this.feedbackService
      .getMyFeedbacks()
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (list) => {
          this.feedbacks = list ?? [];
          this.currentPage = 1;
        },
        error: (error: Error) => {
          this.errorMessage = error.message || 'Unable to load your feedbacks.';
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
