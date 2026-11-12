// events-list.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, finalize, takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../../auth/auth.service';
import { AiEventAssistantComponent } from '../../components/AiEventAssistantComponent/ai-event-assistant.component'; // À adapter selon votre chemin
import {
  EventCategory,
  EventParticipantResponse,
  EventSummary,
  SORT_OPTIONS,
  STATUS_LABELS,
  WaitlistResponse,
} from '../../models/event.models';
import { CategoryService } from '../../services/category.service';
import { EventAnalyticsService } from '../../services/event-analytics.service';
import { EventService } from '../../services/event.service';
import { EventToastContainerComponent } from '../../components/event-toast-container/event-toast-container.component';
import { EventToastService } from '../../services/event-toast.service';
import { PopularEventRanking } from '../../models/event.models';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';

export interface UserEventState {
  regStatus: 'CONFIRMED' | 'PENDING' | 'REJECTED' | null;
  waitlistStatus: 'WAITING' | 'NOTIFIED' | 'EXPIRED' | null;
  waitlistPosition: number | null;
}

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    AiEventAssistantComponent, // Ajout de l'assistant IA
    EventToastContainerComponent
  ],
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.css'],
})
export class EventsListComponent implements OnInit, OnDestroy {
  events: EventSummary[] = [];
  categories: EventCategory[] = [];
  liveRanking: PopularEventRanking[] = [];

  userStates: Map<number, UserEventState> = new Map();
  loadingStates = false;

  loading = true;
  totalElements = 0;
  totalPages = 1;
  currentPage = 0;
  pageSize = 12;

  keyword = '';
  categoryFilter: number | null = null;
  sortBy = 'startDate,asc';
  viewMode: 'grid' | 'list' = 'grid';

  // Nouvelles propriétés pour l'assistant IA
  showAiAssistant = false; // Contrôle l'affichage de l'assistant
  aiAssistantPosition: 'floating' | 'inline' = 'floating'; // Position de l'assistant

  readonly statusLabels = STATUS_LABELS;
  readonly sortOptions = SORT_OPTIONS;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private eventService: EventService,
    private categoryService: CategoryService,
    private analyticsService: EventAnalyticsService,
    public auth: AuthService,
    private router: Router,
    private eventToast: EventToastService,
    private confirmDialogService: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.analyticsService.setRankingLimit(5);

    this.categoryService
      .getAllCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
        },
        error: (error) => console.error('Error loading categories:', error),
      });

    this.search$
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 0;
        this.loadEvents();
      });

    this.analyticsService.liveRanking$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ranking => {
        this.liveRanking = ranking ?? [];
      });

    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Getters existants
  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get isUser(): boolean {
    return this.auth.hasRole('USER');
  }

  get activeCategoryName(): string {
    if (this.categoryFilter == null) {
      return 'All categories';
    }

    return this.categories.find((category) => category.id === this.categoryFilter)?.name ?? 'Filtered';
  }

  get hasActiveFilters(): boolean {
    return !!this.keyword || this.categoryFilter !== null || this.sortBy !== 'startDate,asc';
  }

  // Nouvelles méthodes pour l'assistant IA
  toggleAiAssistant(): void {
    this.showAiAssistant = !this.showAiAssistant;
    // Gérer le scroll du body si nécessaire
    if (this.showAiAssistant && this.aiAssistantPosition === 'floating') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  setAiAssistantPosition(position: 'floating' | 'inline'): void {
    this.aiAssistantPosition = position;
    if (position === 'inline') {
      this.showAiAssistant = true;
    }
  }

  onAiEventSelected(id: number): void {
    this.openDetail(id);
  }

  // Méthodes existantes (getCurrentUserId, loadEvents, loadUserStatesForVisibleEvents, etc.)
  private getCurrentUserId(): number | null {
    const user = this.auth.getCurrentUser?.();
    if (user?.id) {
      return user.id;
    }

    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.id || parsed.userId || null;
      }
    } catch {
      return null;
    }

    return null;
  }

  loadEvents(): void {
    this.loading = true;

    this.eventService
      .getAll({
        keyword: this.keyword,
        categoryId: this.categoryFilter,
        page: this.currentPage,
        size: this.pageSize,
        sort: this.sortBy,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.events = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.loadUserStatesForVisibleEvents();
        },
        error: (error) => console.error('Error loading events:', error),
      });
  }

  loadUserStatesForVisibleEvents(): void {
    const userId = this.getCurrentUserId();
    if (!userId || !this.isUser) {
      return;
    }

    this.loadingStates = true;

    const registrations$ = this.eventService
      .getMyRegistrations(userId, 0, 100)
      .pipe(catchError(() => of({ content: [] as EventParticipantResponse[], totalElements: 0 })));

    const waitlists$ = this.eventService
      .getMyWaitlistEntries(userId, 0, 100)
      .pipe(catchError(() => of({ content: [] as WaitlistResponse[], totalElements: 0 })));

    forkJoin([registrations$, waitlists$])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingStates = false))
      )
      .subscribe({
        next: ([registrationPage, waitlistPage]) => {
          const nextMap = new Map<number, UserEventState>();

          for (const registration of registrationPage.content) {
            if (!registration.eventId) {
              continue;
            }

            const existing = nextMap.get(registration.eventId) || {
              regStatus: null,
              waitlistStatus: null,
              waitlistPosition: null,
            };

            existing.regStatus = registration.status as UserEventState['regStatus'];
            nextMap.set(registration.eventId, existing);
          }

          for (const waitlist of waitlistPage.content) {
            if (!waitlist.eventId) {
              continue;
            }

            const existing = nextMap.get(waitlist.eventId) || {
              regStatus: null,
              waitlistStatus: null,
              waitlistPosition: null,
            };

            existing.waitlistStatus = waitlist.status as UserEventState['waitlistStatus'];
            existing.waitlistPosition = waitlist.position ?? null;
            nextMap.set(waitlist.eventId, existing);
          }

          this.userStates = nextMap;
        },
      });
  }

  // Le reste des méthodes existantes (getUserState, isConfirmed, cancelFromCard, etc.)
  getUserState(eventId: number): UserEventState | null {
    return this.userStates.get(eventId) ?? null;
  }

  isConfirmed(event: EventSummary): boolean {
    return this.getUserState(event.id)?.regStatus === 'CONFIRMED';
  }

  isPending(event: EventSummary): boolean {
    return this.getUserState(event.id)?.regStatus === 'PENDING';
  }

  isOnWaitlist(event: EventSummary): boolean {
    const state = this.getUserState(event.id);
    return !!state?.waitlistStatus && (state.waitlistStatus === 'WAITING' || state.waitlistStatus === 'NOTIFIED');
  }

  hasNotifiedOffer(event: EventSummary): boolean {
    return this.getUserState(event.id)?.waitlistStatus === 'NOTIFIED';
  }

  waitlistPosition(event: EventSummary): number | null {
    return this.getUserState(event.id)?.waitlistPosition ?? null;
  }

  async cancelFromCard(event: EventSummary, domEvent: Event): Promise<void> {
    domEvent.stopPropagation();
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }

    const state = this.getUserState(event.id);
    if (!state) {
      return;
    }

    const hasRegistration = state.regStatus === 'CONFIRMED' || state.regStatus === 'PENDING';
    const hasWaitlist = state.waitlistStatus === 'WAITING' || state.waitlistStatus === 'NOTIFIED';

    if (!hasRegistration && !hasWaitlist) {
      return;
    }

    const confirmed = await firstValueFrom(
      this.confirmDialogService.confirm(
        hasRegistration
          ? 'Are you sure you want to cancel your participation?'
          : 'Are you sure you want to leave the waitlist?',
        {
          title: hasRegistration ? 'Cancel Participation' : 'Leave Waitlist',
          confirmText: hasRegistration ? 'Yes, cancel' : 'Leave waitlist',
          cancelText: 'Keep',
          tone: 'danger',
        }
      )
    );

    if (!confirmed) {
      this.eventToast.info('Action cancelled', 'Action cancelled successfully.');
      return;
    }

    if (hasRegistration) {
      this.eventService.leaveEvent(event.id, userId).subscribe({
        next: () => {
          this.eventToast.success('Participation cancelled', 'Your registration has been cancelled.');
          this.loadUserStatesForVisibleEvents();
          this.loadEvents();
        },
        error: (error) => this.eventToast.error('Cancellation failed', error.error?.message || 'We could not cancel your participation.'),
      });
      return;
    }

    this.eventService.leaveWaitlist(event.id, userId).subscribe({
      next: () => {
        this.eventToast.success('Left waitlist', 'You have been removed from the waitlist.');
        this.loadUserStatesForVisibleEvents();
      },
      error: (error) => this.eventToast.error('Waitlist removal failed', error.error?.message || 'We could not remove you from the waitlist.'),
    });
  }

  onSearch(): void {
    this.search$.next(this.keyword);
  }

  onFilter(): void {
    this.currentPage = 0;
    this.loadEvents();
  }

  clearSearch(): void {
    this.keyword = '';
    this.onFilter();
  }

  resetFilters(): void {
    this.keyword = '';
    this.categoryFilter = null;
    this.sortBy = 'startDate,asc';
    this.currentPage = 0;
    this.loadEvents();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openDetail(id: number, event?: EventSummary): void {
    const currentUserId = this.getCurrentUserId();
    this.analyticsService.track(id, event ? 'SEARCH_CLICK' : 'DETAIL_OPEN', currentUserId);
    this.router.navigateByUrl(`/app/events/${id}`);
  }

  openLiveRankingDetail(item: PopularEventRanking): void {
    this.analyticsService.track(item.eventId, 'SEARCH_CLICK', this.getCurrentUserId());
    this.router.navigateByUrl(`/app/events/${item.eventId}`);
  }

  fillPercentage(event: EventSummary): number {
    if (!event.maxParticipants) {
      return 0;
    }

    return Math.round(((event.maxParticipants - event.remainingSlots) / event.maxParticipants) * 100);
  }

  daysLeft(dateString: string): number | null {
    const eventDate = new Date(dateString);
    eventDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days < 0 ? null : days;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStars(rating: number): boolean[] {
    const rounded = Math.round(rating);
    return Array.from({ length: 5 }, (_, index) => index < rounded);
  }

  getShortDateParts(dateString: string): { month: string; day: string } {
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString('en-GB', { month: 'short' }),
      day: date.toLocaleDateString('en-GB', { day: '2-digit' }),
    };
  }

  getExcerpt(text?: string): string {
    if (!text) {
      return 'Event details will be available soon.';
    }

    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  trackById(_: number, event: EventSummary): number {
    return event.id;
  }

  isJoinable(event: EventSummary): boolean {
    if (!this.isUser) {
      return false;
    }

    const state = this.getUserState(event.id);
    const alreadyRegistered = state?.regStatus === 'CONFIRMED' || state?.regStatus === 'PENDING';
    const onWaitlist = state?.waitlistStatus === 'WAITING' || state?.waitlistStatus === 'NOTIFIED';

    return event.status === 'PLANNED' && event.remainingSlots > 0 && !alreadyRegistered && !onWaitlist;
  }

  isWaitlistable(event: EventSummary): boolean {
    if (!this.isUser) {
      return false;
    }

    const state = this.getUserState(event.id);
    const onWaitlist = state?.waitlistStatus === 'WAITING' || state?.waitlistStatus === 'NOTIFIED';
    return event.status === 'FULL' && !onWaitlist;
  }

  isCompetition(event: EventSummary): boolean {
    return !!event.category?.requiresApproval;
  }

  isCancelled(event: EventSummary): boolean {
    return event.status === 'CANCELLED';
  }

  get pageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);

    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }

    return Array.from({ length: end - start }, (_, index) => start + index);
  }
}