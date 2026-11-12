import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TransitToastService } from '../../../transit/services/transit-toast.service';

import {
  AdminEventService,
  AdminCategoryService,
  AdminCapacityService,
  AdminExportService,
  AdminAuthService,
  AdminParticipantService,
  AdminWaitlistService,
  AdminWeatherService,
  AdminReviewService,
  AdminReminderService,
  AdminEligibilityRuleService,
  AdminCompetitionService,
  PetCompetitionEntry
} from '../../services/admin-api.service';

import { NotificationService, NotificationResponse } from '../../services/notification.service';

import type {
  EventSummary,
  EventCategory,
  EventCapacityResponse,
  EventParticipantResponse,
  WaitlistResponse,
  EventReviewResponse,
  WeatherResponse,
  EventStatsResponse,
  EventEligibilityRule,
  PageResponse,
  SortField,
  SortDirection,
  SortState,
  ConfirmAction
} from '../../models/admin-events.models';

type ActiveModal = 'capacity' | 'participants' | 'waitlist' | 'reviews' | 'weather' | 'reminders' | 'rules' | 'addRule' | 'competitionEntries' | null;

@Component({
  selector: 'app-back-office-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
    

})
export class EventsComponent implements OnInit, OnDestroy {

  // ── Data ──────────────────────────────────────────────────────────────────
  events:       EventSummary[]              = [];
  categories:   EventCategory[]             = [];
  stats:        EventStatsResponse | null   = null;

  // ── State ──────────────────────────────────────────────────────────────────
  loading       = true;
  exporting     = false;
  statsLoading  = true;

  // ── Filters ───────────────────────────────────────────────────────────────
  keyword         = '';
  filterStatus    = '';
  filterCategory  = '';
  filterDateFrom  = '';
  filterDateTo    = '';
  showFilters     = false;
  currentPage     = 0;
  pageSize        = 12;
  totalPages      = 1;
  totalElements   = 0;

  // ── Sorting ───────────────────────────────────────────────────────────────
  sort: SortState = { field: 'startDate', direction: 'asc' };

  // ── Modals ────────────────────────────────────────────────────────────────
  activeModal:      ActiveModal              = null;
  selectedEvent:    EventSummary | null      = null;

  capacityData:     EventCapacityResponse | null     = null;
  participants:     EventParticipantResponse[]       = [];
  pendingList:      EventParticipantResponse[]       = [];
  waitlist:         WaitlistResponse[]               = [];
  reviews:          EventReviewResponse[]            = [];
  weather:          WeatherResponse | null           = null;

  // ── Competition Entries ───────────────────────────────────────────────────
  competitionEntries: PetCompetitionEntry[] = [];

  // ── Eligibility Rules ────────────────────────────────────────────────────
  categoryRules:    EventEligibilityRule[] = [];
  eventRules:       EventEligibilityRule[] = [];
  ruleTarget: 'category' | 'event' = 'category';
  newRule: Partial<EventEligibilityRule> = { 
    hardReject: true, 
    active: true, 
    priority: 0,
    valueType: 'LIST'
  };

  modalLoading      = false;
  activeParticipantTab: 'confirmed' | 'pending' = 'confirmed';

  // ── Confirm ───────────────────────────────────────────────────────────────
  confirmAction: ConfirmAction | null = null;

  // ── Notifications ────────────────────────────────────────────────────────
  adminNotifications: NotificationResponse[] = [];
  unreadCount = 0;
  showNotifications = false;
  private refreshInterval: any;

  // ── Labels ────────────────────────────────────────────────────────────────
  readonly statusLabels: Record<string, string> = {
    PLANNED:   'Planned',
    ONGOING:   'Ongoing',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    FULL:      'Full'
  };

  readonly statusIcons: Record<string, string> = {
    PLANNED:   '📅',
    ONGOING:   '🟢',
    COMPLETED: '✅',
    CANCELLED: '🚫',
    FULL:      '🔴'
  };

  readonly weatherIcons: Record<string, string> = {
    SUNNY:   '☀️',
    CLOUDY:  '⛅',
    RAINY:   '🌧️',
    STORMY:  '⛈️',
    SNOWY:   '❄️',
    UNKNOWN: '🌤️'
  };

  readonly reminderLabels: Record<string, string> = {
    J2:  '2 days before',
    H24: '24h before',
    H2:  '2h before'
  };

  readonly criteriaOptions = [
    { value: 'ALLOWED_BREEDS', label: 'Allowed Breeds', type: 'LIST' },
    { value: 'FORBIDDEN_BREEDS', label: 'Forbidden Breeds', type: 'LIST' },
    { value: 'ALLOWED_SPECIES', label: 'Allowed Species', type: 'LIST' },
    { value: 'MIN_AGE_MONTHS', label: 'Minimum Age (months)', type: 'NUMBER' },
    { value: 'MAX_AGE_MONTHS', label: 'Maximum Age (months)', type: 'NUMBER' },
    { value: 'MIN_WEIGHT_KG', label: 'Minimum Weight (kg)', type: 'NUMBER' },
    { value: 'MAX_WEIGHT_KG', label: 'Maximum Weight (kg)', type: 'NUMBER' },
    { value: 'VACCINATION_REQUIRED', label: 'Vaccination Required', type: 'BOOLEAN' },
    { value: 'LICENSE_REQUIRED', label: 'License/Pedigree Required', type: 'BOOLEAN' },
    { value: 'MEDICAL_CERT_REQUIRED', label: 'Medical Certificate Required', type: 'BOOLEAN' },
    { value: 'ALLOWED_SEXES', label: 'Allowed Sexes', type: 'LIST' },
    { value: 'MIN_EXPERIENCE_LEVEL', label: 'Minimum Experience Level', type: 'NUMBER' },
    { value: 'ALLOWED_COLORS', label: 'Allowed Colors', type: 'LIST' },
    { value: 'FORBIDDEN_COLORS', label: 'Forbidden Colors', type: 'LIST' }
  ];

  private search$  = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private eventService:       AdminEventService,
    private categoryService:    AdminCategoryService,
    private capacityService:    AdminCapacityService,
    private exportService:      AdminExportService,
    private participantService: AdminParticipantService,
    private waitlistService:    AdminWaitlistService,
    private weatherService:     AdminWeatherService,
    private reviewService:      AdminReviewService,
    private reminderService:    AdminReminderService,
    private ruleService:        AdminEligibilityRuleService,
    private competitionService: AdminCompetitionService,
    private auth:               AdminAuthService,
    private cdr:                ChangeDetectorRef,
    private router:             Router,
    private notificationService: NotificationService,
    private transitToast:       TransitToastService
  ) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadCategories();
    this.loadStats();
    this.setupSearch();
    this.loadEvents();
    this.loadNotifications();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // ─── Init helpers ───────────────────────────────────────────────────────
  private loadCategories(): void {
    this.categoryService.getAll(this.auth.getAdminId()).pipe(takeUntil(this.destroy$)).subscribe({
      next:  (cats) => this.categories = cats,
      error: ()     => this.toast('Unable to load categories', 'warning')
    });
  }

  private loadStats(): void {
    this.statsLoading = true;
    this.eventService.getStats(this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$), finalize(() => this.statsLoading = false))
      .subscribe({
        next:  (s) => this.stats = s,
        error: ()  => {}
      });
  }

  private setupSearch(): void {
    this.search$.pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage = 0; this.loadEvents(); });
  }

  // ─── Main Loading ───────────────────────────────────────────────────────
  loadEvents(): void {
    this.loading = true;
    const params: Record<string, any> = {
      page: this.currentPage,
      size: this.pageSize,
      sort: `${this.sort.field},${this.sort.direction}`
    };
    if (this.filterStatus)   params['status']     = this.filterStatus;
    if (this.filterCategory) params['categoryId'] = +this.filterCategory;
    if (this.keyword.trim()) params['keyword']    = this.keyword.trim();

    this.eventService.getAll(params)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next:  (r) => {
          this.events        = r.content;
          this.totalPages    = r.totalPages;
          this.totalElements = r.totalElements;
        },
        error: () => this.toast('Error loading events', 'error')
      });
  }

  // ─── Filters & Sorting ──────────────────────────────────────────────────
  onSearch(): void { this.search$.next(this.keyword); }
  onFilter(): void { this.currentPage = 0; this.loadEvents(); }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  get hasQuickFilters(): boolean {
    return !!(this.filterStatus || this.filterCategory);
  }

  clearQuickFilters(): void {
    this.filterStatus = '';
    this.filterCategory = '';
    this.onFilter();
  }

  resetFilters(): void {
    this.keyword = '';
    this.filterStatus = '';
    this.filterCategory = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.currentPage = 0;
    this.loadEvents();
  }

  toggleSort(field: SortField): void {
    if (this.sort.field === field) {
      this.sort = { field, direction: this.sort.direction === 'asc' ? 'desc' : 'asc' };
    } else {
      this.sort = { field, direction: 'asc' };
    }
    this.currentPage = 0;
    this.loadEvents();
  }

  sortIcon(field: SortField): string {
    if (this.sort.field !== field) return '⇅';
    return this.sort.direction === 'asc' ? '↑' : '↓';
  }

  // ─── Pagination ─────────────────────────────────────────────────────────
  goToPage(p: number): void {
    this.currentPage = p;
    this.loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  previousPage(): void { if (this.currentPage > 0) this.goToPage(this.currentPage - 1); }
  nextPage():     void { if (this.currentPage + 1 < this.totalPages) this.goToPage(this.currentPage + 1); }

  get pageNumbers(): number[] {
    const start = Math.max(0, this.currentPage - 2);
    const end   = Math.min(this.totalPages, start + 5);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  // ─── UI Calculations ────────────────────────────────────────────────────
  fillPct(e: EventSummary): number {
    if (!e.maxParticipants) return 0;
    return Math.round(((e.maxParticipants - e.remainingSlots) / e.maxParticipants) * 100);
  }

  fillClass(pct: number): string {
    if (pct >= 100) return 'fill-full';
    if (pct >= 75)  return 'fill-warn';
    return 'fill-ok';
  }

  getDaysRemaining(e: EventSummary): number | null {
    const diff = new Date(e.startDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
    const days = Math.ceil(diff / 86_400_000);
    return days < 0 ? null : days;
  }

  getDaysLabel(e: EventSummary): string {
    const d = this.getDaysRemaining(e);
    if (d === null) return '✅ Past';
    if (d === 0)    return '🔥 Today';
    if (d === 1)    return '⭐ Tomorrow';
    return `📆 D-${d}`;
  }

  getDaysClass(e: EventSummary): string {
    const d = this.getDaysRemaining(e);
    if (d === null) return 'days-past';
    if (d === 0)    return 'days-today';
    if (d <= 3)     return 'days-soon';
    return 'days-normal';
  }

  formatDate(d: string | Date | undefined): string {
    if (!d) return 'TBD';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(d: string | Date | undefined): string {
    if (!d) return '--:--';
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  formatDateTime(d: string | Date | undefined): string {
    if (!d) return 'TBD';
    return `${this.formatDate(d)} at ${this.formatTime(d)}`;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PLANNED:   'pill--planned',
      ONGOING:   'pill--ongoing',
      COMPLETED: 'pill--completed',
      CANCELLED: 'pill--cancelled',
      FULL:      'pill--full'
    };
    return map[status] ?? 'pill--planned';
  }

  getEligibilityScoreClass(score: number | undefined | null): string {
    if (score === null || score === undefined || score === 0) return 'score-none';
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  }

  goToCreateEvent(): void {
    this.router.navigate(['/admin/events/create']);
  }

  // ─── Modal Capacity ─────────────────────────────────────────────────────
  openCapacityModal(e: EventSummary): void {
    this.selectedEvent = e;
    this.activeModal   = 'capacity';
    this.modalLoading  = true;
    this.capacityData  = null;

    this.capacityService.getSnapshot(e.id)
      .pipe(finalize(() => this.modalLoading = false))
      .subscribe({
        next:  (c) => this.capacityData = c,
        error: ()  => { this.toast('Unable to load capacity', 'error'); this.closeModal(); }
      });
  }

  recalculateCapacity(): void {
    if (!this.capacityData) return;
    this.modalLoading = true;
    this.capacityService.recalculate(this.capacityData.eventId, this.auth.getAdminId())
      .pipe(finalize(() => this.modalLoading = false))
      .subscribe({
        next:  (c) => { this.capacityData = c; this.loadEvents(); this.toast('Capacity recalculated', 'success'); },
        error: ()  => this.toast('Recalculation failed', 'error')
      });
  }

  // ─── Modal Participants ─────────────────────────────────────────────────
  openParticipantsModal(e: EventSummary): void {
    this.selectedEvent = e;
    this.activeModal   = 'participants';
    this.activeParticipantTab = 'confirmed';
    this.loadParticipants(e.id);
  }

  private loadParticipants(eventId: number): void {
    this.modalLoading = true;
    this.participants = [];
    this.pendingList  = [];

    this.participantService.getConfirmed(eventId, this.auth.getAdminId())
      .subscribe({ next: (r) => this.participants = r.content, error: () => {} });

    this.participantService.getPending(eventId, this.auth.getAdminId())
      .pipe(finalize(() => this.modalLoading = false))
      .subscribe({ next: (r) => this.pendingList = r.content, error: () => {} });
  }

  approveParticipant(p: EventParticipantResponse): void {
    if (!p || !p.id) return;
    this.participantService.approve(p.id, this.auth.getAdminId()).subscribe({
      next: () => {
        this.toast(`${p.userName || 'Participant'} approved`, 'success');
        if (this.selectedEvent) this.loadParticipants(this.selectedEvent.id);
        this.loadEvents();
      },
      error: () => this.toast('Approval failed', 'error')
    });
  }

  rejectParticipant(p: EventParticipantResponse): void {
    if (!p || !p.id) return;
    this.participantService.reject(p.id, this.auth.getAdminId()).subscribe({
      next: () => {
        this.toast(`${p.userName || 'Participant'} rejected`, 'info');
        if (this.selectedEvent) this.loadParticipants(this.selectedEvent.id);
      },
      error: () => this.toast('Rejection failed', 'error')
    });
  }

  // ─── Modal Waitlist ─────────────────────────────────────────────────────
  openWaitlistModal(e: EventSummary): void {
    this.selectedEvent = e;
    this.activeModal   = 'waitlist';
    this.modalLoading  = true;
    this.waitlist      = [];

    this.waitlistService.getWaitlist(e.id, this.auth.getAdminId())
      .pipe(finalize(() => this.modalLoading = false))
      .subscribe({
        next:  (r) => this.waitlist = r.content,
        error: ()  => this.toast('Unable to load waitlist', 'error')
      });
  }

  promoteNext(): void {
    if (!this.selectedEvent) return;
    this.waitlistService.promoteNext(this.selectedEvent.id, this.auth.getAdminId()).subscribe({
      next: (result) => {
        if (result) {
          this.toast('User promoted successfully', 'success');
          this.openWaitlistModal(this.selectedEvent!);
          this.loadEvents();
        } else {
          this.toast('No user to promote', 'info');
        }
      },
      error: () => this.toast('Promotion failed', 'error')
    });
  }

  notifyWaitlistEntry(entry: WaitlistResponse): void {
    if (!this.selectedEvent) return;
    this.waitlistService.notifyEntry(this.selectedEvent.id, entry.id, this.auth.getAdminId(), 24).subscribe({
      next: (updated) => {
        const idx = this.waitlist.findIndex(w => w.id === entry.id);
        if (idx !== -1) this.waitlist[idx] = updated;
        this.toast(`${entry.userName} notified — 24h to confirm`, 'success');
      },
      error: (err) => this.toast(err?.error?.message ?? 'Notification failed', 'error')
    });
  }

  // ─── Modal Weather ──────────────────────────────────────────────────────
  openWeatherModal(e: EventSummary): void {
    this.selectedEvent = e;
    this.activeModal   = 'weather';
    this.modalLoading  = true;
    this.weather       = null;

    this.weatherService.getForEvent(e.id)
      .pipe(finalize(() => this.modalLoading = false))
      .subscribe({
        next:  (w) => this.weather = w,
        error: ()  => this.toast('Weather unavailable', 'warning')
      });
  }

  // ─── Modal Reviews ──────────────────────────────────────────────────────
  openReviewsModal(e: EventSummary): void {
    this.selectedEvent = e;
    this.activeModal   = 'reviews';
    this.modalLoading  = true;
    this.reviews       = [];

    this.reviewService.getReviews(e.id)
      .pipe(finalize(() => this.modalLoading = false))
      .subscribe({
        next:  (r) => this.reviews = r.content,
        error: ()  => this.toast('Unable to load reviews', 'error')
      });
  }

  deleteReview(r: EventReviewResponse): void {
    if (!r || !r.id) return;
    this.reviewService.deleteReview(r.id, this.auth.getAdminId()).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(x => x.id !== r.id);
        this.toast('Review deleted', 'success');
      },
      error: () => this.toast('Deletion failed', 'error')
    });
  }

  starsArray(rating: number | undefined): number[] {
    const safeRating = rating || 0;
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  // ─── Modal Reminders ────────────────────────────────────────────────────
  openRemindersModal(e: EventSummary): void {
    this.selectedEvent = e;
    this.activeModal   = 'reminders';
  }

  cancelAllReminders(): void {
    if (!this.selectedEvent) return;
    this.reminderService.cancelAll(this.selectedEvent.id).subscribe({
      next:  () => { this.toast('All reminders cancelled', 'success'); this.closeModal(); },
      error: () => this.toast('Cancellation failed', 'error')
    });
  }

  // ─── Modal Competition Entries ──────────────────────────────────────────
  openCompetitionEntriesModal(e: EventSummary): void {
    this.selectedEvent = e;
    this.activeModal = 'competitionEntries';
    this.modalLoading = true;
    this.competitionEntries = [];

    this.competitionService.getCompetitionEntries(e.id, this.auth.getAdminId(), 0, 100).subscribe({
      next: (response) => {
        this.competitionEntries = response.content;
        this.modalLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.modalLoading = false;
        this.toast('Unable to load competition entries', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Modal Eligibility Rules ────────────────────────────────────────────
  openRulesModal(e: EventSummary): void {
    this.selectedEvent = e;
    this.activeModal = 'rules';
    this.loadRules();
  }

  loadRules(): void {
    if (!this.selectedEvent) return;
    
    const categoryId = this.selectedEvent.category?.id;
    
    if (categoryId) {
      this.ruleService.getByCategory(categoryId).subscribe({
        next: (r) => {
          console.log('Category rules:', r);
          this.categoryRules = r;
        },
        error: () => this.toast('Unable to load category rules', 'warning')
      });
    }
    
    this.ruleService.getByEvent(this.selectedEvent.id).subscribe({
      next: (r) => {
        console.log('Event rules:', r);
        this.eventRules = r;
      },
      error: () => this.toast('Unable to load event rules', 'warning')
    });
  }

  addRuleToCategory(): void {
    this.ruleTarget = 'category';
    this.newRule = { hardReject: true, active: true, priority: 0, valueType: 'LIST' };
    this.activeModal = 'addRule';
  }

  addRuleToEvent(): void {
    this.ruleTarget = 'event';
    this.newRule = { hardReject: true, active: true, priority: 0, valueType: 'LIST' };
    this.activeModal = 'addRule';
  }

  saveRule(): void {
    if (!this.selectedEvent) return;
    
    const userId = this.auth.getAdminId();
    const isCategoryRule = this.ruleTarget === 'category';
    
    const rule: any = {
      ...this.newRule,
      categoryId: isCategoryRule ? (this.selectedEvent.category?.id ?? null) : null,
      eventId: isCategoryRule ? null : this.selectedEvent.id
    };
    
    console.log('Saving rule:', rule);
    
    this.ruleService.create(rule, userId).subscribe({
      next: () => {
        this.toast('Rule added successfully', 'success');
        this.loadRules();
        this.closeModal();
      },
      error: (err) => {
        console.error('Error saving rule:', err);
        this.toast(err.error?.message || 'Failed to add rule', 'error');
      }
    });
  }

  deleteRule(rule: EventEligibilityRule): void {
    const userId = this.auth.getAdminId();
    this.ruleService.delete(rule.id, userId).subscribe({
      next: () => {
        this.toast('Rule deleted', 'success');
        this.loadRules();
      },
      error: () => this.toast('Deletion failed', 'error')
    });
  }

  isListCriteria(): boolean {
    const listCriteria = ['ALLOWED_BREEDS', 'FORBIDDEN_BREEDS', 'ALLOWED_SPECIES', 
                          'ALLOWED_SEXES', 'ALLOWED_COLORS', 'FORBIDDEN_COLORS'];
    return listCriteria.includes(this.newRule.criteria || '');
  }

  isNumberCriteria(): boolean {
    const numberCriteria = ['MIN_AGE_MONTHS', 'MAX_AGE_MONTHS', 'MIN_WEIGHT_KG', 
                            'MAX_WEIGHT_KG', 'MIN_EXPERIENCE_LEVEL'];
    return numberCriteria.includes(this.newRule.criteria || '');
  }

  isBooleanCriteria(): boolean {
    const booleanCriteria = ['VACCINATION_REQUIRED', 'LICENSE_REQUIRED', 'MEDICAL_CERT_REQUIRED'];
    return booleanCriteria.includes(this.newRule.criteria || '');
  }

  onCriteriaChange(): void {
    const option = this.criteriaOptions.find(o => o.value === this.newRule.criteria);
    if (option) {
      this.newRule.valueType = option.type as 'LIST' | 'NUMBER' | 'BOOLEAN';
      this.newRule.listValues = '';
      this.newRule.numericValue = undefined;
      this.newRule.booleanValue = undefined;
    }
  }

  // ─── Helpers pour l'affichage ───────────────────────────────────────────
  getCriteriaLabel(criteria: string): string {
    const labels: Record<string, string> = {
      'ALLOWED_BREEDS': 'Allowed breeds',
      'FORBIDDEN_BREEDS': 'Forbidden breeds',
      'ALLOWED_SPECIES': 'Allowed species',
      'MIN_AGE_MONTHS': 'Minimum age (months)',
      'MAX_AGE_MONTHS': 'Maximum age (months)',
      'MIN_WEIGHT_KG': 'Minimum weight (kg)',
      'MAX_WEIGHT_KG': 'Maximum weight (kg)',
      'VACCINATION_REQUIRED': 'Vaccination required',
      'LICENSE_REQUIRED': 'License/Pedigree required',
      'MEDICAL_CERT_REQUIRED': 'Medical certificate required',
      'ALLOWED_SEXES': 'Allowed sexes',
      'MIN_EXPERIENCE_LEVEL': 'Minimum experience level',
      'MAX_PARTICIPANTS_PER_OWNER': 'Max participants per owner',
      'SAME_OWNER_RESTRICTION': 'Same owner restriction',
      'ALLOWED_COLORS': 'Allowed colors',
      'FORBIDDEN_COLORS': 'Forbidden colors'
    };
    return labels[criteria] || criteria;
  }

  parseRuleValues(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map(v => v.trim()).filter(v => v.length > 0);
  }

  getUnitFor(criteria: string): string {
    const units: Record<string, string> = {
      'MIN_AGE_MONTHS': 'months',
      'MAX_AGE_MONTHS': 'months',
      'MIN_WEIGHT_KG': 'kg',
      'MAX_WEIGHT_KG': 'kg',
      'MIN_EXPERIENCE_LEVEL': '/5'
    };
    return units[criteria] || '';
  }

  getScoreClass(score: number | undefined): string {
    const safeScore = score || 0;
    if (safeScore >= 80) return 'score-high';
    if (safeScore >= 50) return 'score-medium';
    return 'score-low';
  }

  // ─── Close Modal ────────────────────────────────────────────────────────
  closeModal(): void {
    this.activeModal = null;
    this.selectedEvent = null;
    this.capacityData = null;
    this.participants = [];
    this.pendingList = [];
    this.waitlist = [];
    this.reviews = [];
    this.weather = null;
    this.categoryRules = [];
    this.eventRules = [];
    this.competitionEntries = [];
    this.ruleTarget = 'category';
    this.newRule = { hardReject: true, active: true, priority: 0, valueType: 'LIST' };
  }

  // ─── Export ─────────────────────────────────────────────────────────────
  exportAll(): void {
    this.exporting = true;
    this.exportService.exportAllEvents(this.auth.getAdminId())
      .pipe(finalize(() => this.exporting = false))
      .subscribe({
        next:  (b) => { this.exportService.downloadBlob(b, `events_${this.today()}.csv`); this.toast('CSV exported', 'success'); },
        error: ()  => this.toast('Export failed', 'error')
      });
  }

  exportParticipants(e: EventSummary): void {
    const safe = e.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    this.exportService.exportParticipants(e.id, this.auth.getAdminId()).subscribe({
      next:  (b) => { this.exportService.downloadBlob(b, `participants_${safe}_${this.today()}.csv`); this.toast('Participants exported', 'success'); },
      error: ()  => this.toast('Export failed', 'error')
    });
  }

  // ─── Confirm Dialog ─────────────────────────────────────────────────────
  confirmCancel(e: EventSummary): void {
    this.confirmAction = {
      title:   'Cancel Event',
      message: `Are you sure you want to cancel "${e.title}"? All participants will be notified.`,
      label:   'Yes, cancel',
      variant: 'warning',
      fn: () => {
        this.eventService.cancel(e.id, this.auth.getAdminId()).subscribe({
          next:  () => { this.loadEvents(); this.toast('Event cancelled', 'success'); },
          error: (err) => this.toast(err?.error?.message ?? 'Cancellation failed', 'error')
        });
      }
    };
  }

  confirmDelete(e: EventSummary): void {
    this.confirmAction = {
      title:   'Delete Event',
      message: `This action is irreversible. Permanently delete "${e.title}"?`,
      label:   'Delete',
      variant: 'danger',
      fn: () => {
        this.eventService.delete(e.id, this.auth.getAdminId()).subscribe({
          next:  () => { this.loadEvents(); this.toast('Event deleted', 'success'); },
          error: (err) => this.toast(err?.error?.message ?? 'Deletion failed', 'error')
        });
      }
    };
  }

  executeConfirm(): void { this.confirmAction?.fn(); this.confirmAction = null; }
  closeConfirm():   void { this.confirmAction = null; }

  // ─── Toast Stack ────────────────────────────────────────────────────────
  toast(msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    if (type === 'success') {
      this.transitToast.success('Success', msg);
      return;
    }
    if (type === 'error') {
      this.transitToast.error('Error', msg);
      return;
    }
    this.transitToast.info(type === 'warning' ? 'Warning' : 'Info', msg);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────
  private today(): string { return new Date().toISOString().split('T')[0]; }

  canCancel(e: EventSummary): boolean {
    return !['CANCELLED', 'COMPLETED'].includes(e.status);
  }

  getPendingCount(event: EventSummary): number {
    return (event as any).pendingCount ?? 0;
  }

  trackById(_: number, item: { id: number }): number { return item.id; }

  // ─── Waitlist Status Helpers ────────────────────────────────────────────
  getWaitlistStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
      'WAITING': 'Waiting',
      'NOTIFIED': 'Offer Sent',
      'CONFIRMED': 'Confirmed',
      'CANCELLED': 'Cancelled',
      'EXPIRED': 'Expired'
    };
    return status ? labels[status] || status : 'Unknown';
  }

  getWaitlistStatusClass(status: string | undefined): string {
    const classes: Record<string, string> = {
      'WAITING': 'status-waiting',
      'NOTIFIED': 'status-notified',
      'CONFIRMED': 'status-confirmed',
      'CANCELLED': 'status-cancelled',
      'EXPIRED': 'status-expired'
    };
    return status ? classes[status] || '' : '';
  }

  getTimeRemaining(minutes: number | undefined): string {
    if (!minutes || minutes <= 0) return 'Expired';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins}min`;
  }

  // ─── Notifications ──────────────────────────────────────────────────────
  loadNotifications(): void {
    const adminId = this.auth.getAdminId();
    this.notificationService.getNotifications(adminId, 0, 20).subscribe({
      next: (response) => {
        this.adminNotifications = response.notifications;
        this.unreadCount = response.unreadCount;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading notifications:', err)
    });
  }

  startPolling(): void {
    const adminId = this.auth.getAdminId();
    this.notificationService.getUnreadCount(adminId).subscribe({
      next: (result) => {
        this.unreadCount = result.unreadCount;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error getting unread count:', err)
    });
    
    this.refreshInterval = setInterval(() => {
      this.loadNotifications();
      this.notificationService.getUnreadCount(adminId).subscribe({
        next: (result) => {
          this.unreadCount = result.unreadCount;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error refreshing unread count:', err)
      });
    }, 30000);
  }

  toggleNotificationPanel(): void {
    this.showNotifications = !this.showNotifications;
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  markNotificationRead(notificationId: number): void {
    const adminId = this.auth.getAdminId();
    this.notificationService.markAsRead(adminId, notificationId).subscribe({
      next: () => {
        const notif = this.adminNotifications.find(n => n.id === notificationId);
        if (notif) notif.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.cdr.detectChanges();
      }
    });
  }

  markAllNotificationsRead(): void {
    const adminId = this.auth.getAdminId();
    this.notificationService.markAllAsRead(adminId).subscribe({
      next: () => {
        this.adminNotifications.forEach(n => n.read = true);
        this.unreadCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      'REGISTRATION_PENDING': '📝',
      'REGISTRATION_APPROVED': '✅',
      'REGISTRATION_REJECTED': '❌',
      'REGISTRATION_CANCELLED': '🗑️',
      'WAITLIST_CONFIRMED_BY_USER': '🎉'
    };
    return icons[type] || '🔔';
  }

  onNotificationClick(notification: NotificationResponse): void {
    this.markNotificationRead(notification.id);
    if (notification.deepLink) {
      this.router.navigateByUrl(notification.deepLink);
    } else if (notification.referenceId) {
      switch (notification.type) {
        case 'REGISTRATION_PENDING':
          this.router.navigate(['/admin/events', notification.referenceId, 'participants', 'pending']);
          break;
        case 'WAITLIST_CONFIRMED_BY_USER':
          this.router.navigate(['/admin/events', notification.referenceId, 'waitlist']);
          break;
        default:
          this.router.navigate(['/admin/events', notification.referenceId]);
      }
    }
    this.closeNotifications();
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      PLANNED: '📅',
      ONGOING: '🟢',
      COMPLETED: '✅',
      CANCELLED: '🚫',
      FULL: '🔴'
    };
    return icons[status] || '📌';
  }

  viewEvent(eventId: number): void {
    this.router.navigate(['/admin/events', eventId]);
  }

  goToEditEvent(eventId: number): void {
    this.router.navigate(['/admin/events', eventId, 'edit']);
  }
}