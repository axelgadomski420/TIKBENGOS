import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { finalize, switchMap, takeUntil, tap } from 'rxjs/operators';

import { AdminAuthService } from '../../services/admin-api.service';

interface PopularEventDTO {
  eventId: number;
  rank: number;
  title: string;
  categoryName: string;
  categoryIcon: string;
  startDate: string;
  location: string;
  popularityScore: number;
  views: number;
  clicks: number;
  engagement: number;
  uniqueViews: number;
  totalInteractions: number;
  registrations: number;
  conversionRate: number;
  remainingSlots: number;
  lastUpdatedAt: string | null;
}

interface EventPopularityDetailDTO {
  eventId: number;
  title: string;
  totalViews: number;
  uniqueViews: number;
  totalClicks: number;
  searchClicks: number;
  detailOpens: number;
  waitlistJoins: number;
  registrations: number;
  reviewsPosted: number;
  engagement: number;
  conversionRate: number;
  popularityScore: number;
  trend: string;
  liveRank: number | null;
  lastUpdatedAt: string | null;
}

interface PopularityDashboardDTO {
  topEvents: PopularEventDTO[];
  liveRanking: PopularEventDTO[];
  neglectedEvents: PopularEventDTO[];
  interactionsByType: Record<string, number>;
  totalViewsToday: number;
  totalClicksToday: number;
  totalEngagementToday: number;
  totalInteractionsThisWeek: number;
  averageConversionRate: number;
  period: { from: string; to: string; label: string };
  generatedAt: string;
}

interface BreakdownItem {
  icon: string;
  label: string;
  weight: number;
  color: string;
  count: number;
}

const API_BASE = 'http://localhost:8087/elif/api';

@Component({
  selector: 'app-popularity-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DecimalPipe, DatePipe, SlicePipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popularity-dashboard.component.html',
  styleUrls: ['./popularity-dashboard.component.css']
})
export class PopularityDashboardComponent implements OnInit, OnDestroy {
  dashboard: PopularityDashboardDTO | null = null;
  topEvents: PopularEventDTO[] = [];
  selectedDetail: EventPopularityDetailDTO | null = null;
  breakdownItems: BreakdownItem[] = [];

  loading = true;
  loadingTop = false;
  loadingDetail = false;
  errorDashboard = '';
  errorDetail = '';
  selectedDays = 30;

  private readonly destroy$ = new Subject<void>();
  private maxScore = 1;

  readonly formulaItems = [
    { icon: '👁️', label: 'View', weight: 1, color: '#6366f1' },
    { icon: '🔍', label: 'Search click', weight: 3, color: '#0ea5e9' },
    { icon: '📄', label: 'Detail open', weight: 5, color: '#8b5cf6' },
    { icon: '⏳', label: 'Waitlist join', weight: 10, color: '#f59e0b' },
    { icon: '⭐', label: 'Review posted', weight: 15, color: '#f97316' },
    { icon: '✅', label: 'Registration', weight: 20, color: '#1d9e75' },
  ];

  constructor(
    private http: HttpClient,
    private auth: AdminAuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    timer(0, 15000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.fetchDashboard(!this.dashboard))
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    this.fetchDashboard(true).subscribe();
  }

  changePeriod(days: number): void {
    if (this.loadingTop) {
      return;
    }

    this.selectedDays = days;
    this.selectedDetail = null;
    this.loadingTop = true;

    this.http.get<PopularEventDTO[]>(`${API_BASE}/events/popular`, {
      params: new HttpParams()
        .set('limit', '10')
        .set('days', days.toString())
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.loadingTop = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: events => {
        this.topEvents = events ?? [];
        this.maxScore = Math.max(...this.topEvents.map(event => event.popularityScore), 1);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  openEventDetail(eventId: number): void {
    if (this.selectedDetail?.eventId === eventId) {
      this.selectedDetail = null;
      this.cdr.markForCheck();
      return;
    }

    this.loadingDetail = true;
    this.errorDetail = '';
    this.selectedDetail = null;

    this.http.get<EventPopularityDetailDTO>(`${API_BASE}/events/${eventId}/popularity`, {
      params: new HttpParams().set('adminId', this.auth.getAdminId().toString())
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.loadingDetail = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: detail => {
        this.selectedDetail = detail;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorDetail = 'Failed to load event details.';
        this.cdr.markForCheck();
      }
    });
  }

  closeDetail(): void {
    this.selectedDetail = null;
    this.cdr.markForCheck();
  }

  getBarWidth(count: number): number {
    const max = Math.max(...this.breakdownItems.map(item => item.count), 1);
    return Math.round((count / max) * 100);
  }

  getScoreBarWidth(score: number): number {
    return Math.round((score / this.maxScore) * 100);
  }

  getDetailBarWidth(value: number, detail: EventPopularityDetailDTO): number {
    const max = Math.max(
      detail.totalViews,
      detail.totalClicks,
      detail.waitlistJoins,
      detail.registrations,
      detail.reviewsPosted,
      detail.engagement,
      1
    );
    return Math.round((value / max) * 100);
  }

  getRankClass(index: number): string {
    if (index === 0) return 'pd-rank--gold';
    if (index === 1) return 'pd-rank--silver';
    if (index === 2) return 'pd-rank--bronze';
    return 'pd-rank--default';
  }

  getTrendClass(trend: string): string {
    if (trend === 'RISING') return 'trend--rising';
    if (trend === 'DECLINING') return 'trend--declining';
    return 'trend--stable';
  }

  trackEvent(_: number, event: PopularEventDTO): number {
    return event.eventId;
  }

  private fetchDashboard(showLoader: boolean) {
    this.loading = showLoader;
    this.errorDashboard = '';

    return this.http.get<PopularityDashboardDTO>(`${API_BASE}/events/admin/popularity/dashboard`, {
      params: new HttpParams().set('adminId', this.auth.getAdminId().toString())
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }),
      tap(data => {
        this.dashboard = data;
        this.breakdownItems = this.computeBreakdownItems(data.interactionsByType ?? {});

        if (this.selectedDays === 30 || this.topEvents.length === 0) {
          this.topEvents = data.topEvents ?? [];
        }

        this.maxScore = Math.max(...this.topEvents.map(event => event.popularityScore), 1);
        this.cdr.markForCheck();
      })
    );
  }

  private computeBreakdownItems(types: Record<string, number>): BreakdownItem[] {
    return [
      { icon: '👁️', label: 'Views', weight: 1, color: '#6366f1', count: types['VIEW'] || 0 },
      { icon: '🔍', label: 'Search clicks', weight: 3, color: '#0ea5e9', count: types['SEARCH_CLICK'] || 0 },
      { icon: '📄', label: 'Detail opens', weight: 5, color: '#8b5cf6', count: types['DETAIL_OPEN'] || 0 },
      { icon: '⏳', label: 'Waitlist joins', weight: 10, color: '#f59e0b', count: types['WAITLIST_JOIN'] || 0 },
      { icon: '⭐', label: 'Reviews posted', weight: 15, color: '#f97316', count: types['REVIEW_POSTED'] || 0 },
      { icon: '✅', label: 'Registrations', weight: 20, color: '#1d9e75', count: types['REGISTRATION'] || 0 },
    ];
  }
}
