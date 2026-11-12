import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  CATEGORY_CONFIG,
  ChecklistCategory,
  ChecklistStats,
  PRIORITY_CONFIG,
  SafetyChecklistItem
} from '../../models/safety-checklist.model';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';
import { SafetyChecklistService } from '../../services/safety-checklist.service';
import { TravelPlanService } from '../../services/travel-plan.service';

type ChecklistFilter = 'ALL' | 'REMAINING' | 'COMPLETED' | 'MANDATORY';

@Component({
  selector: 'app-travel-plan-checklist',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './travel-plan-checklist.component.html',
  styleUrl: './travel-plan-checklist.component.scss'
})
export class TravelPlanChecklistComponent implements OnInit, OnDestroy {
  protected readonly Math = Math;
  readonly categoryConfig = CATEGORY_CONFIG;
  readonly priorityConfig = PRIORITY_CONFIG;
  readonly categories: ChecklistCategory[] = ['DOCUMENT', 'TRANSPORT', 'HEALTH', 'COMFORT', 'HYDRATION'];

  planId = 0;
  items: SafetyChecklistItem[] = [];
  filteredItems: SafetyChecklistItem[] = [];
  stats: ChecklistStats | null = null;

  loading = true;
  error = '';
  activeFilter: ChecklistFilter = 'ALL';
  toggling = new Set<number>();
  planStatus = '';
  isLocked = false;

  groupedItems: Record<ChecklistCategory, SafetyChecklistItem[]> = {
    DOCUMENT: [],
    TRANSPORT: [],
    HEALTH: [],
    COMFORT: [],
    HYDRATION: []
  };

  private readonly destroy$ = new Subject<void>();
  private itemsLoaded = false;
  private statsLoaded = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly checklistService: SafetyChecklistService,
    private readonly travelPlanService: TravelPlanService,
    private readonly toastService: PetTransitToastService
  ) {}

  ngOnInit(): void {
    const rawPlanId = this.route.snapshot.paramMap.get('planId') ?? this.route.snapshot.paramMap.get('id') ?? '';
    this.planId = Number(rawPlanId);

    if (!Number.isFinite(this.planId) || this.planId <= 0) {
      this.loading = false;
      this.error = 'Invalid travel plan id.';
      return;
    }

    this.loadPlanStatus();
    this.loadStats();
    this.loadItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get completedItemsCount(): number {
    return this.stats?.completedItems ?? 0;
  }

  get totalItemsCount(): number {
    return this.stats?.totalItems ?? 0;
  }

  get remainingItemsCount(): number {
    if (!this.stats) {
      return 0;
    }

    return Math.max(this.stats.totalItems - this.stats.completedItems, 0);
  }

  get mandatoryLeftCount(): number {
    if (!this.stats) {
      return 0;
    }

    return Math.max(this.stats.totalMandatory - this.stats.completedMandatory, 0);
  }

  get mandatoryProgressColor(): string {
    const mandatoryPercent = this.stats?.mandatoryCompletionPercentage ?? 0;
    return mandatoryPercent >= 80 ? '#43a047' : '#ff8f00';
  }

  goBack(): void {
    this.router.navigate(['/app/transit/plans', this.planId]);
  }

  goBackToDetail(): void {
    this.goBack();
  }

  goToDocuments(): void {
    this.router.navigate(['/app/transit/plans', this.planId, 'documents']);
  }

  retry(): void {
    this.error = '';
    this.loading = true;
    this.itemsLoaded = false;
    this.statsLoaded = false;
    this.loadStats();
    this.loadItems();
  }

  setFilter(filter: ChecklistFilter): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  showAll(): void {
    this.setFilter('ALL');
  }

  formatPercent(value: number): string {
    return Math.round(value) + '%';
  }

  isDocumentTask(item: SafetyChecklistItem): boolean {
    const taskCode = (item as SafetyChecklistItem & { taskCode?: string }).taskCode;
    return item.category === 'DOCUMENT' || (taskCode?.startsWith('DOC_') ?? false);
  }

  toggleItem(item: SafetyChecklistItem): void {
    if (this.isLocked || this.toggling.has(item.id)) {
      return;
    }

    this.toggling.add(item.id);

    const call$ = item.completed
      ? this.checklistService.markUncomplete(this.planId, item.id)
      : this.checklistService.markComplete(this.planId, item.id);

    call$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        const idx = this.items.findIndex((existingItem) => existingItem.id === item.id);

        if (idx !== -1) {
          this.items[idx] = updated;
        }

        this.applyFilter();
        this.loadStats();
        this.toggling.delete(item.id);

      },
      error: () => {
        this.toggling.delete(item.id);
        this.toastService.error('Failed to update task.');
      }
    });
  }

  isToggling(itemId: number): boolean {
    return this.toggling.has(itemId);
  }

  categoryTotal(category: ChecklistCategory): number {
    const allCategoryItems = this.items.filter((item) => item.category === category);
    return allCategoryItems.length;
  }

  categoryCompletion(category: ChecklistCategory): number {
    const allCategoryItems = this.items.filter((item) => item.category === category);

    if (allCategoryItems.length === 0) {
      return 0;
    }

    const completedCount = allCategoryItems.filter((item) => item.completed).length;
    return Math.round((completedCount / allCategoryItems.length) * 100);
  }

  getCategoryItems(category: ChecklistCategory): SafetyChecklistItem[] {
    return this.groupedItems[category] ?? [];
  }

  progressColor(percentage: number): string {
    if (percentage < 40) {
      return '#ef4444';
    }

    if (percentage < 80) {
      return '#ff8f00';
    }

    return '#43a047';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) {
      return '';
    }

    const parsedDate = new Date(dateStr);
    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    return parsedDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  dueDateTone(dateStr?: string): 'due-overdue' | 'due-today' | 'due-future' {
    if (!dateStr) {
      return 'due-future';
    }

    const now = new Date();
    const dueDate = new Date(dateStr);

    if (Number.isNaN(dueDate.getTime())) {
      return 'due-future';
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();

    if (due < today) {
      return 'due-overdue';
    }

    if (due === today) {
      return 'due-today';
    }

    return 'due-future';
  }

  hasItemsForCurrentFilter(): boolean {
    return this.filteredItems.length > 0;
  }

  trackByCategory(_: number, category: ChecklistCategory): ChecklistCategory {
    return category;
  }

  trackByItem(_: number, item: SafetyChecklistItem): number {
    return item.id;
  }

  private loadItems(): void {
    this.checklistService
      .getChecklist(this.planId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.items = items;
          this.applyFilter();
          this.itemsLoaded = true;
          this.syncLoadingState();
        },
        error: () => {
          this.items = [];
          this.filteredItems = [];
          this.resetGroups();
          this.error = 'Unable to load checklist tasks.';
          this.itemsLoaded = true;
          this.syncLoadingState();
        }
      });
  }

  private loadPlanStatus(): void {
    this.travelPlanService
      .getTravelPlanById(this.planId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plan) => {
          this.planStatus = plan.status;
          this.isLocked = ['SUBMITTED', 'APPROVED', 'COMPLETED'].includes(plan.status);
        },
        error: () => {
          this.planStatus = '';
          this.isLocked = false;
        }
      });
  }

  private loadStats(): void {
    this.checklistService
      .getStats(this.planId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
          this.statsLoaded = true;
          this.syncLoadingState();
        },
        error: () => {
          this.stats = null;
          this.error = this.error || 'Unable to load checklist progress.';
          this.statsLoaded = true;
          this.syncLoadingState();
        }
      });
  }

  private syncLoadingState(): void {
    this.loading = !(this.itemsLoaded && this.statsLoaded);
  }

  private applyFilter(): void {
    switch (this.activeFilter) {
      case 'REMAINING':
        this.filteredItems = this.items.filter((item) => !item.completed);
        break;
      case 'COMPLETED':
        this.filteredItems = this.items.filter((item) => item.completed);
        break;
      case 'MANDATORY':
        this.filteredItems = this.items.filter((item) => item.mandatory);
        break;
      case 'ALL':
      default:
        this.filteredItems = [...this.items];
        break;
    }

    this.groupByCategory();
  }

  private groupByCategory(): void {
    this.groupedItems = {
      DOCUMENT: this.filteredItems.filter((item) => item.category === 'DOCUMENT'),
      TRANSPORT: this.filteredItems.filter((item) => item.category === 'TRANSPORT'),
      HEALTH: this.filteredItems.filter((item) => item.category === 'HEALTH'),
      COMFORT: this.filteredItems.filter((item) => item.category === 'COMFORT'),
      HYDRATION: this.filteredItems.filter((item) => item.category === 'HYDRATION')
    };
  }

  private resetGroups(): void {
    this.groupedItems = {
      DOCUMENT: [],
      TRANSPORT: [],
      HEALTH: [],
      COMFORT: [],
      HYDRATION: []
    };
  }
}
