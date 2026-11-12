import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs';
import {
  Destination,
  DestinationStatusFilter,
  DestinationType,
  TransportType
} from '../../models/destination.model';
import { TransitConfirmationDialogService } from '../../services/transit-confirmation-dialog.service';
import { DestinationService } from '../../services/destination.service';
import { TransitToastService } from '../../services/transit-toast.service';
import { DestinationStatusBadgeComponent } from '../../components/destination-status-badge/destination-status-badge.component';
import { PetFriendlyStarsComponent } from '../../components/pet-friendly-stars/pet-friendly-stars.component';
import { TransitToastContainerComponent } from '../../components/transit-toast-container/transit-toast-container.component';
import { TransitConfirmationDialogComponent } from '../../components/transit-confirmation-dialog/transit-confirmation-dialog.component';
import { TransitExportService } from '../../services/transit-export.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-destinations-list',
  templateUrl: './destinations-list.component.html',
  styleUrl: './destinations-list.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    MatTooltipModule,
    DestinationStatusBadgeComponent,
    PetFriendlyStarsComponent,
    TransitToastContainerComponent,
    TransitConfirmationDialogComponent,
    PaginationComponent
  ]
})
export class DestinationsListComponent implements OnInit, OnDestroy {
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusFilters: DestinationStatusFilter[] = [
    'ALL',
    'PUBLISHED',
    'DRAFT',
    'SCHEDULED',
    'ARCHIVED'
  ];
  readonly placeholderCover = 'images/animals/cat.png';

  allDestinations: Destination[] = [];
  filteredDestinations: Destination[] = [];
  activeStatusFilter: DestinationStatusFilter = 'ALL';
  loading = true;
  errorMessage = '';
  busyDestinationIds = new Set<number>();
  showFilters = false;
  startDateFilter = '';
  endDateFilter = '';
  exportingPdf = false;
  exportingExcel = false;
  currentPage = 1;
  itemsPerPage = 9;
  totalItems = 0;

  private readonly destroy$ = new Subject<void>();
  private readonly typeFallbackImage: Record<DestinationType, string> = {
    BEACH: 'images/animals/turtle.png',
    MOUNTAIN: 'images/animals/pony.png',
    CITY: 'images/animals/parakeet.png',
    FOREST: 'images/animals/hamster.png',
    ROAD_TRIP: 'images/animals/chick.png',
    INTERNATIONAL: 'images/animals/cat.png'
  };

  constructor(
    private readonly destinationService: DestinationService,
    private readonly transitToastService: TransitToastService,
    private readonly transitConfirmationDialogService: TransitConfirmationDialogService,
    private readonly transitExportService: TransitExportService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadDestinations();

    this.searchControl.valueChanges
      .pipe(debounceTime(120), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalCount(): number {
    return this.allDestinations.length;
  }

  get publishedCount(): number {
    return this.allDestinations.filter((destination) => destination.status === 'PUBLISHED').length;
  }

  get draftCount(): number {
    return this.allDestinations.filter((destination) => destination.status === 'DRAFT').length;
  }

  get archivedCount(): number {
    return this.allDestinations.filter((destination) => destination.status === 'ARCHIVED').length;
  }

  get scheduledCount(): number {
    return this.allDestinations.filter((destination) => destination.status === 'SCHEDULED').length;
  }

  setStatusFilter(filter: DestinationStatusFilter): void {
    this.activeStatusFilter = filter;
    this.currentPage = 1;
    this.applyFilters();
  }

  reloadDestinations(): void {
    this.loadDestinations();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onStartDateFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.startDateFilter = String(target?.value ?? '').trim();
    this.currentPage = 1;
    this.applyFilters();
  }

  onEndDateFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.endDateFilter = String(target?.value ?? '').trim();
    this.currentPage = 1;
    this.applyFilters();
  }

  clearQuickFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.activeStatusFilter = 'ALL';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get hasQuickFilters(): boolean {
    return (
      Boolean(this.searchControl.value.trim()) ||
      this.activeStatusFilter !== 'ALL' ||
      Boolean(this.startDateFilter) ||
      Boolean(this.endDateFilter)
    );
  }

  get paginatedDestinations(): Destination[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDestinations.slice(start, start + this.itemsPerPage);
  }

  exportFilteredDestinationsPdf(): void {
    if (this.exportingPdf) {
      return;
    }

    this.exportingPdf = true;
    this.transitExportService
      .exportDestinationsPdf(this.currentExportFilters())
      .pipe(finalize(() => (this.exportingPdf = false)))
      .subscribe({
        next: () => {
          this.transitToastService.success('Export ready', 'Destinations PDF exported successfully.');
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unable to export destinations PDF.';
          this.transitToastService.error('Export failed', message);
        }
      });
  }

  exportFilteredDestinationsExcel(): void {
    if (this.exportingExcel) {
      return;
    }

    this.exportingExcel = true;
    this.transitExportService
      .exportDestinationsExcel(this.currentExportFilters())
      .pipe(finalize(() => (this.exportingExcel = false)))
      .subscribe({
        next: () => {
          this.transitToastService.success('Export ready', 'Destinations Excel exported successfully.');
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unable to export destinations Excel.';
          this.transitToastService.error('Export failed', message);
        }
      });
  }

  isActiveFilter(filter: DestinationStatusFilter): boolean {
    return this.activeStatusFilter === filter;
  }

  trackByDestinationId(index: number, destination: Destination): number {
    return destination.id ?? index;
  }

  formatFilterLabel(filter: DestinationStatusFilter): string {
    if (filter === 'ALL') {
      return 'All';
    }
    return filter.charAt(0) + filter.slice(1).toLowerCase().replace('_', ' ');
  }

  getDestinationTypeIcon(destinationType: DestinationType): string {
    switch (destinationType) {
      case 'BEACH':
        return 'fa-umbrella-beach';
      case 'MOUNTAIN':
        return 'fa-mountain';
      case 'CITY':
        return 'fa-city';
      case 'FOREST':
        return 'fa-tree';
      case 'ROAD_TRIP':
        return 'fa-road';
      case 'INTERNATIONAL':
      default:
        return 'fa-globe';
    }
  }

  getTransportIcon(transportType: TransportType): string {
    switch (transportType) {
      case 'CAR':
        return 'fa-car-side';
      case 'TRAIN':
        return 'fa-train';
      case 'PLANE':
        return 'fa-plane-departure';
      case 'BUS':
      default:
        return 'fa-bus';
    }
  }

  viewDetails(destination: Destination): void {
    if (!destination.id) {
      return;
    }
    this.router.navigate(['/admin/transit/destinations', destination.id]);
  }

  editDestination(destination: Destination): void {
    if (!destination.id) {
      return;
    }
    this.router.navigate(['/admin/transit/destinations', destination.id, 'edit']);
  }

  toggleArchive(destination: Destination): void {
    if (!destination.id || this.isDestinationBusy(destination.id)) {
      return;
    }

    const willArchive = destination.status !== 'ARCHIVED';
    this.transitConfirmationDialogService
      .confirm({
        title: willArchive
          ? `Archive "${destination.title}"?`
          : `Restore "${destination.title}"?`,
        message: willArchive
          ? 'This destination will move to archived state and disappear from active workflows.'
          : 'This destination will be restored for active workflow processing.',
        confirmLabel: willArchive ? 'Archive' : 'Restore',
        cancelLabel: 'Cancel',
        tone: 'warning'
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.executeArchiveAction(destination.id as number, willArchive);
      });
  }

  deleteDestination(destination: Destination): void {
    if (!destination.id || this.isDestinationBusy(destination.id)) {
      return;
    }

    if (!this.canDeleteDestination(destination)) {
      return;
    }

    this.transitConfirmationDialogService
      .confirm({
        title: `Delete "${destination.title}"?`,
        message: 'This action cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        tone: 'danger'
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.executeDeleteAction(destination.id as number);
      });
  }

  formatDestinationType(destinationType: DestinationType): string {
    return this.destinationService.formatDestinationType(destinationType);
  }

  formatTransportType(transportType: TransportType): string {
    return this.destinationService.formatTransportType(transportType);
  }

  isDestinationBusy(destinationId: number): boolean {
    return this.busyDestinationIds.has(destinationId);
  }

  canDeleteDestination(destination: Destination): boolean {
    return Number(destination.linkedPlansCount ?? 0) === 0;
  }

  getDestinationDeleteTooltip(destination: Destination): string {
    const linkedPlansCount = Number(destination.linkedPlansCount ?? 0);
    if (linkedPlansCount > 0) {
      return `Cannot delete — ${linkedPlansCount} travel plan(s) linked to this destination`;
    }

    return '';
  }

  primaryDateLabel(destination: Destination): string {
    if (destination.status === 'PUBLISHED' && destination.publishedAt) {
      return 'Published';
    }
    if (destination.status === 'SCHEDULED' && destination.scheduledPublishAt) {
      return 'Scheduled';
    }
    return 'Created';
  }

  primaryDateValue(destination: Destination): string | undefined {
    if (destination.status === 'PUBLISHED' && destination.publishedAt) {
      return destination.publishedAt;
    }
    if (destination.status === 'SCHEDULED' && destination.scheduledPublishAt) {
      return destination.scheduledPublishAt;
    }
    return destination.createdAt;
  }

  hasUpdatedAt(destination: Destination): boolean {
    return Boolean(destination.updatedAt && destination.updatedAt !== destination.createdAt);
  }

  resolveCoverImage(destination: Destination): string {
    const explicitCover = this.destinationService.resolveCoverImageUrl(destination.coverImageUrl);
    if (explicitCover.length > 0) {
      const versionSeed = destination.updatedAt ?? destination.createdAt ?? destination.publishedAt ?? null;
      return this.destinationService.appendCacheBuster(explicitCover, versionSeed);
    }

    return this.typeFallbackImage[destination.destinationType] ?? this.placeholderCover;
  }

  onCoverImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }
    image.src = this.placeholderCover;
  }

  private loadDestinations(): void {
    this.loading = true;
    this.errorMessage = '';

    this.destinationService
      .getAdminDestinations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (destinations) => {
          this.allDestinations = destinations;
          this.currentPage = 1;
          this.applyFilters();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.errorMessage =
            'Unable to load destinations right now. Please refresh and try again.';
        }
      });
  }

  private applyFilters(): void {
    const searchText = this.searchControl.value.trim().toLowerCase();

    this.filteredDestinations = this.allDestinations.filter((destination) => {
      const matchesStatus =
        this.activeStatusFilter === 'ALL' || destination.status === this.activeStatusFilter;

      const matchesSearch =
        searchText.length === 0 ||
        [destination.title, destination.country, destination.region].some((field) =>
          field.toLowerCase().includes(searchText)
        );

      const matchesDate = this.matchesDateRange(destination.createdAt);

      return matchesStatus && matchesSearch && matchesDate;
    });

    this.totalItems = this.filteredDestinations.length;
    if (this.totalItems === 0) {
      this.currentPage = 1;
      return;
    }

    const maxPage = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
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
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    appliedFilters?: string;
  } {
    const status = this.activeStatusFilter;
    const search = this.searchControl.value.trim();
    const filterParts: string[] = [];

    if (status !== 'ALL') {
      filterParts.push(`Status = ${this.formatFilterLabel(status)}`);
    }

    if (search) {
      filterParts.push(`Search = ${search}`);
    }

    if (this.startDateFilter) {
      filterParts.push(`Start Date = ${this.startDateFilter}`);
    }

    if (this.endDateFilter) {
      filterParts.push(`End Date = ${this.endDateFilter}`);
    }

    return {
      status: status === 'ALL' ? undefined : status,
      search: search || undefined,
      startDate: this.startDateFilter || undefined,
      endDate: this.endDateFilter || undefined,
      appliedFilters: filterParts.join(' | ') || undefined
    };
  }

  private replaceDestination(updatedDestination: Destination): void {
    if (!updatedDestination.id) {
      return;
    }

    const destinationIndex = this.allDestinations.findIndex(
      (destination) => destination.id === updatedDestination.id
    );

    if (destinationIndex === -1) {
      this.allDestinations = [updatedDestination, ...this.allDestinations];
    } else {
      this.allDestinations = this.allDestinations.map((destination, index) =>
        index === destinationIndex ? updatedDestination : destination
      );
    }

    this.applyFilters();
  }

  private setDestinationBusy(destinationId: number, value: boolean): void {
    if (value) {
      this.busyDestinationIds.add(destinationId);
      return;
    }
    this.busyDestinationIds.delete(destinationId);
  }

  private executeArchiveAction(destinationId: number, willArchive: boolean): void {
    this.setDestinationBusy(destinationId, true);

    const request$ = willArchive
      ? this.destinationService.archiveDestination(destinationId)
      : this.destinationService.unarchiveDestination(destinationId);

    request$
      .pipe(
        finalize(() => this.setDestinationBusy(destinationId, false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (updatedDestination) => {
          this.replaceDestination(updatedDestination);
          this.transitToastService.success(
            willArchive ? 'Destination archived' : 'Destination restored',
            willArchive
              ? 'Destination moved to archived destinations.'
              : 'Destination is now active in workflow.'
          );
        },
        error: () => {
          this.transitToastService.error(
            'Action failed',
            willArchive
              ? 'Could not archive this destination.'
              : 'Could not restore this destination.'
          );
        }
      });
  }

  private executeDeleteAction(destinationId: number): void {
    this.setDestinationBusy(destinationId, true);

    this.destinationService
      .deleteDestination(destinationId)
      .pipe(
        finalize(() => this.setDestinationBusy(destinationId, false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.allDestinations = this.allDestinations.filter(
            (currentDestination) => currentDestination.id !== destinationId
          );
          this.applyFilters();
          this.transitToastService.success(
            'Destination deleted',
            'Destination has been removed permanently.'
          );
        },
        error: () => {
          this.transitToastService.error(
            'Delete failed',
            'Unable to delete this destination right now.'
          );
        }
      });
  }
}

