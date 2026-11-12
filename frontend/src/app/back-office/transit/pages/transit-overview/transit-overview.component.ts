import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip
} from 'chart.js';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { TransitStatisticsService } from '../../services/transit-statistics.service';
import { TransitDashboardModel } from '../../models/transit-dashboard.model';
import { TransitExportService } from '../../services/transit-export.service';
import { TravelPlanAdminService } from '../../services/travel-plan-admin.service';
import { DestinationService } from '../../services/destination.service';
import { TravelFeedbackAdminService } from '../../services/travel-feedback-admin.service';
import { TravelPlanSummary } from '../../models/travel-plan-admin.model';
import { Destination } from '../../models/destination.model';
import { FeedbackType, TravelFeedbackAdmin } from '../../models/travel-feedback-admin.model';

Chart.register(
  BarController,
  DoughnutController,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

/**
 * Transit Overview Dashboard — admin action-focused overview.
 */
@Component({
  selector: 'app-transit-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './transit-overview.component.html',
  styleUrls: ['./transit-overview.component.scss']
})
export class TransitOverviewComponent implements OnInit, AfterViewInit, OnDestroy {

  private static readonly REQUEST_TIMEOUT_MS = 12000;
  private static cachedOverview: {
    stats: TransitDashboardModel;
    plans: TravelPlanSummary[];
    destinations: Destination[];
    feedback: TravelFeedbackAdmin[];
  } | null = null;

  @ViewChild('barChartCanvas') barChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutCanvas') doughnutCanvas!: ElementRef<HTMLCanvasElement>;

  stats: TransitDashboardModel | null = null;
  allPlans: TravelPlanSummary[] = [];
  allDestinations: Destination[] = [];
  allFeedback: TravelFeedbackAdmin[] = [];

  isLoading = true;
  error: string | null = null;

  today = new Date();
  pipelineStages: Array<{
    label: string;
    description: string;
    count: number;
    color: string;
    barHeight: number;
  }> = [];

  exportingOverviewPdf = false;
  exportingOverviewExcel = false;

  private submittedPlansCache: TravelPlanSummary[] = [];
  private unresolvedIncidentsCache: TravelFeedbackAdmin[] = [];
  private unresolvedComplaintsCache: TravelFeedbackAdmin[] = [];
  private feedbackByTypeCache = {
    reviews: 0,
    suggestions: 0,
    incidents: 0,
    complaints: 0
  };
  private mostVisitedDestinationsCache: Array<{
    id: number;
    count: number;
    title: string;
    country: string;
  }> = [];
  private destinationsWithNoCompletedTripsCache = 0;

  private barChart: any = null;
  private doughnutChart: any = null;
  private pendingChartRender = false;
  private chartRenderTimer: number | null = null;
  private viewInitialized = false;

  constructor(
    private readonly statsService: TransitStatisticsService,
    private readonly travelPlanAdminService: TravelPlanAdminService,
    private readonly destinationService: DestinationService,
    private readonly travelFeedbackAdminService: TravelFeedbackAdminService,
    private readonly transitExportService: TransitExportService,
    public readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.pendingChartRender) {
      this.scheduleChartRender();
    }
  }

  ngOnDestroy(): void {
    if (this.chartRenderTimer !== null) {
      window.clearTimeout(this.chartRenderTimer);
      this.chartRenderTimer = null;
    }

    if (this.barChart) {
      this.barChart.destroy();
      this.barChart = null;
    }

    if (this.doughnutChart) {
      this.doughnutChart.destroy();
      this.doughnutChart = null;
    }
  }

  loadStats(forceRefresh = false): void {
    if (!forceRefresh && TransitOverviewComponent.cachedOverview) {
      const cached = TransitOverviewComponent.cachedOverview;
      this.stats = cached.stats;
      this.allPlans = cached.plans;
      this.allDestinations = cached.destinations;
      this.allFeedback = cached.feedback;
      this.recomputeDerivedData();
      this.buildPipelineStages();
      this.isLoading = false;
      this.pendingChartRender = true;
      if (this.viewInitialized) {
        this.scheduleChartRender();
      }
      return;
    }

    this.isLoading = true;
    this.error = null;

    forkJoin({
      stats: this.statsService.getStatistics().pipe(
        timeout(TransitOverviewComponent.REQUEST_TIMEOUT_MS),
        catchError((err) => {
          console.warn('[TransitOverview] Statistics endpoint unavailable, using computed fallback.', err);
          return of(null);
        })
      ),
      plans: this.travelPlanAdminService.getAllPlans().pipe(
        timeout(TransitOverviewComponent.REQUEST_TIMEOUT_MS),
        catchError((err) => {
          console.warn('[TransitOverview] Plans endpoint unavailable, defaulting to empty list.', err);
          return of([] as TravelPlanSummary[]);
        })
      ),
      destinations: this.destinationService.getAdminDestinations().pipe(
        timeout(TransitOverviewComponent.REQUEST_TIMEOUT_MS),
        catchError((err) => {
          console.warn('[TransitOverview] Destinations endpoint unavailable, defaulting to empty list.', err);
          return of([] as Destination[]);
        })
      ),
      feedback: this.travelFeedbackAdminService.getAllFeedbacks().pipe(
        timeout(TransitOverviewComponent.REQUEST_TIMEOUT_MS),
        catchError((err) => {
          console.warn('[TransitOverview] Feedback endpoint unavailable, defaulting to empty list.', err);
          return of([] as TravelFeedbackAdmin[]);
        })
      )
    }).subscribe({
      next: ({ stats, plans, destinations, feedback }) => {
        this.allPlans = plans ?? [];
        this.allDestinations = destinations ?? [];
        this.allFeedback = feedback ?? [];
        this.stats = stats ?? this.buildStatsFromCollections();
        TransitOverviewComponent.cachedOverview = {
          stats: this.stats,
          plans: [...this.allPlans],
          destinations: [...this.allDestinations],
          feedback: [...this.allFeedback]
        };
        if (!stats) {
          this.error = 'Live statistics service is unavailable. Showing computed overview from available data.';
        }
        this.recomputeDerivedData();
        this.buildPipelineStages();
        this.isLoading = false;
        this.pendingChartRender = true;
        if (this.viewInitialized) {
          this.scheduleChartRender();
        }
      },
      error: (err) => {
        console.error('[TransitOverview] Failed to load overview data', err);
        this.error = 'Could not load transit overview data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  get submittedPlans(): TravelPlanSummary[] {
    return this.submittedPlansCache;
  }

  get submittedPlansCount(): number {
    return this.allPlans?.filter((p) => p.status === 'SUBMITTED').length ?? 0;
  }

  get overdueSubmittedPlans(): TravelPlanSummary[] {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    return this.submittedPlans.filter((p) => {
      const submitted = new Date(p.submittedAt || p.createdAt);
      return submitted < twoDaysAgo;
    });
  }

  get unresolvedIncidents(): TravelFeedbackAdmin[] {
    return this.unresolvedIncidentsCache;
  }

  get unresolvedIncidentsCount(): number {
    return (
      this.allFeedback?.filter(
        (f) =>
          f.feedbackType === 'INCIDENT' &&
          f.processingStatus !== 'RESOLVED' &&
          f.processingStatus !== 'CLOSED'
      ).length ?? 0
    );
  }

  get unresolvedComplaints(): TravelFeedbackAdmin[] {
    return this.unresolvedComplaintsCache;
  }

  get approvalRate(): number {
    const approved = this.allPlans.filter(
      (p) => p.status === 'APPROVED' || p.status === 'COMPLETED'
    ).length;
    const rejected = this.allPlans.filter((p) => p.status === 'REJECTED').length;
    const total = approved + rejected;

    return total === 0 ? 0 : Math.round((approved / total) * 100);
  }

  get avgPreparationDays(): number {
    const submitted = this.allPlans.filter((p) => p.submittedAt && p.createdAt);
    if (!submitted.length) {
      return 0;
    }

    const totalDays = submitted.reduce((sum, p) => {
      const diff = new Date(p.submittedAt as string).getTime() - new Date(p.createdAt).getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);

    return Math.round(totalDays / submitted.length);
  }

  get publishedDestinations(): number {
    return this.allDestinations.filter((d) => d.status === 'PUBLISHED').length;
  }

  get draftDestinations(): number {
    return this.allDestinations.filter((d) => d.status === 'DRAFT').length;
  }

  get scheduledDestinations(): number {
    return this.allDestinations.filter((d) => d.status === 'SCHEDULED').length;
  }

  get destinationsWithNoPlans(): number {
    const destinationIdsWithPlans = new Set(this.allPlans.map((p) => p.destinationId));

    return this.allDestinations
      .filter((d) => d.status === 'PUBLISHED')
      .filter((d) => Number(d.id) > 0 && !destinationIdsWithPlans.has(Number(d.id))).length;
  }

  get feedbackResolutionRate(): number {
    const actionable =
      this.allFeedback?.filter(
        (f) => f.feedbackType === 'COMPLAINT' || f.feedbackType === 'INCIDENT'
      ) ?? [];

    if (!actionable.length) {
      return 100;
    }

    const resolved = actionable.filter(
      (f) => f.processingStatus === 'RESOLVED' || f.processingStatus === 'CLOSED'
    ).length;

    return Math.round((resolved / actionable.length) * 100);
  }

  get mostVisitedDestinations(): Array<{
    id: number;
    count: number;
    title: string;
    country: string;
  }> {
    return this.mostVisitedDestinationsCache;
  }

  get destinationsWithNoCompletedTrips(): number {
    return this.destinationsWithNoCompletedTripsCache;
  }

  get feedbackByType(): {
    reviews: number;
    suggestions: number;
    incidents: number;
    complaints: number;
  } {
    return this.feedbackByTypeCache;
  }

  private recomputeDerivedData(): void {
    this.submittedPlansCache = this.allPlans.filter((p) => p.status === 'SUBMITTED');
    this.unresolvedIncidentsCache = this.allFeedback.filter(
      (f) =>
        f.feedbackType === 'INCIDENT' &&
        f.processingStatus !== 'RESOLVED' &&
        f.processingStatus !== 'CLOSED'
    );
    this.unresolvedComplaintsCache = this.allFeedback.filter(
      (f) =>
        f.feedbackType === 'COMPLAINT' &&
        f.processingStatus !== 'RESOLVED' &&
        f.processingStatus !== 'CLOSED'
    );

    this.feedbackByTypeCache = {
      reviews: this.allFeedback.filter((f) => f.feedbackType === 'REVIEW').length,
      suggestions: this.allFeedback.filter((f) => f.feedbackType === 'SUGGESTION').length,
      incidents: this.allFeedback.filter((f) => f.feedbackType === 'INCIDENT').length,
      complaints: this.allFeedback.filter((f) => f.feedbackType === 'COMPLAINT').length
    };

    const destinationById = new Map<number, Destination>();
    this.allDestinations.forEach((destination) => {
      destinationById.set(Number(destination.id), destination);
    });

    const completedPlans = this.allPlans.filter((p) => p.status === 'COMPLETED');
    const destinationCounts = new Map<number, number>();
    completedPlans.forEach((plan) => {
      const destinationId = Number(plan.destinationId);
      destinationCounts.set(destinationId, (destinationCounts.get(destinationId) ?? 0) + 1);
    });

    this.mostVisitedDestinationsCache = Array.from(destinationCounts.entries())
      .map(([id, count]) => {
        const destination = destinationById.get(id);
        return {
          id,
          count,
          title: destination?.title || 'Unknown',
          country: destination?.country || ''
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const completedDestinationIds = new Set<number>(
      completedPlans.map((plan) => Number(plan.destinationId))
    );
    this.destinationsWithNoCompletedTripsCache = this.allDestinations
      .filter((destination) => destination.status === 'PUBLISHED')
      .filter((destination) => !completedDestinationIds.has(Number(destination.id)))
      .length;
  }

  buildPipelineStages(): void {
    const counts = {
      SUBMITTED: this.allPlans.filter((p) => p.status === 'SUBMITTED').length,
      IN_PREPARATION: this.allPlans.filter((p) => p.status === 'IN_PREPARATION').length,
      APPROVED: this.allPlans.filter((p) => p.status === 'APPROVED').length,
      REJECTED: this.allPlans.filter((p) => p.status === 'REJECTED').length,
      COMPLETED: this.allPlans.filter((p) => p.status === 'COMPLETED').length
    };

    const max = Math.max(...Object.values(counts), 1);

    this.pipelineStages = [
      {
        label: 'Submitted',
        description: 'Waiting for admin review',
        count: counts.SUBMITTED,
        color: '#7c3aed',
        barHeight: Math.max(20, (counts.SUBMITTED / max) * 120)
      },
      {
        label: 'In Preparation',
        description: 'Client completing documents',
        count: counts.IN_PREPARATION,
        color: '#e65100',
        barHeight: Math.max(20, (counts.IN_PREPARATION / max) * 120)
      },
      {
        label: 'Approved',
        description: 'Ready to travel',
        count: counts.APPROVED,
        color: '#43a047',
        barHeight: Math.max(20, (counts.APPROVED / max) * 120)
      },
      {
        label: 'Rejected',
        description: 'Returned for correction',
        count: counts.REJECTED,
        color: '#dc2626',
        barHeight: Math.max(20, (counts.REJECTED / max) * 120)
      },
      {
        label: 'Completed',
        description: 'Trip finished',
        count: counts.COMPLETED,
        color: '#0891b2',
        barHeight: Math.max(20, (counts.COMPLETED / max) * 120)
      }
    ];
  }

  goToSubmittedPlans(): void {
    this.router.navigate(['/back-office/transit/travel-plans']);
  }

  goToFeedback(type: FeedbackType): void {
    this.router.navigate(['/back-office/transit/feedback'], {
      queryParams: { type }
    });
  }

  private buildStatsFromCollections(): TransitDashboardModel {
    const totalDestinations = this.allDestinations.length;
    const publishedDestinations = this.allDestinations.filter((d) => d.status === 'PUBLISHED').length;
    const scheduledDestinations = this.allDestinations.filter((d) => d.status === 'SCHEDULED').length;
    const draftDestinations = this.allDestinations.filter((d) => d.status === 'DRAFT').length;
    const archivedDestinations = this.allDestinations.filter((d) => d.status === 'ARCHIVED').length;

    const totalTravelPlans = this.allPlans.length;
    const submittedPlans = this.allPlans.filter((p) => p.status === 'SUBMITTED').length;
    const inPreparationPlans = this.allPlans.filter((p) => p.status === 'IN_PREPARATION').length;
    const approvedPlans = this.allPlans.filter((p) => p.status === 'APPROVED').length;
    const rejectedPlans = this.allPlans.filter((p) => p.status === 'REJECTED').length;
    const completedPlans = this.allPlans.filter((p) => p.status === 'COMPLETED').length;

    const totalFeedback = this.allFeedback.length;
    const reviewCount = this.allFeedback.filter((f) => f.feedbackType === 'REVIEW').length;
    const suggestionCount = this.allFeedback.filter((f) => f.feedbackType === 'SUGGESTION').length;
    const incidentCount = this.allFeedback.filter((f) => f.feedbackType === 'INCIDENT').length;
    const complaintCount = this.allFeedback.filter((f) => f.feedbackType === 'COMPLAINT').length;
    const resolvedFeedback = this.allFeedback.filter(
      (f) => f.processingStatus === 'RESOLVED' || f.processingStatus === 'CLOSED'
    ).length;
    const openFeedback = Math.max(0, totalFeedback - resolvedFeedback);

    return {
      totalDestinations,
      publishedDestinations,
      scheduledDestinations,
      draftDestinations,
      archivedDestinations,
      totalTravelPlans,
      submittedPlans,
      inPreparationPlans,
      approvedPlans,
      rejectedPlans,
      completedPlans,
      totalFeedback,
      reviewCount,
      suggestionCount,
      incidentCount,
      complaintCount,
      openFeedback,
      resolvedFeedback
    };
  }

  exportOverviewPdf(): void {
    if (this.exportingOverviewPdf) {
      return;
    }

    this.exportingOverviewPdf = true;
    this.transitExportService
      .exportOverviewPdf()
      .pipe(finalize(() => (this.exportingOverviewPdf = false)))
      .subscribe({
        error: (err) => {
          console.error('[TransitOverview] Failed to export overview PDF', err);
          this.error = 'Could not export overview PDF. Please try again.';
        }
      });
  }

  exportOverviewExcel(): void {
    if (this.exportingOverviewExcel) {
      return;
    }

    this.exportingOverviewExcel = true;
    this.transitExportService
      .exportOverviewExcel()
      .pipe(finalize(() => (this.exportingOverviewExcel = false)))
      .subscribe({
        error: (err) => {
          console.error('[TransitOverview] Failed to export overview Excel', err);
          this.error = 'Could not export overview Excel. Please try again.';
        }
      });
  }

  private drawCharts(): void {
    if (!this.stats) {
      return;
    }

    if (!this.barChartCanvas || !this.doughnutCanvas) {
      return;
    }

    this.drawBarChart();
    this.drawDoughnutChart();
  }

  private scheduleChartRender(): void {
    if (this.chartRenderTimer !== null) {
      return;
    }

    this.chartRenderTimer = window.setTimeout(() => {
      this.chartRenderTimer = null;
      if (!this.pendingChartRender) {
        return;
      }

      this.pendingChartRender = false;
      this.drawCharts();
    }, 0);
  }

  private drawBarChart(): void {
    if (!this.barChartCanvas) {
      return;
    }

    const ctx = this.barChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    if (this.barChart) {
      this.barChart.destroy();
    }

    const s = this.stats as TransitDashboardModel;
    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Submitted', 'In Preparation', 'Approved', 'Rejected', 'Completed'],
        datasets: [
          {
            label: 'Travel Plans',
            data: [
              s.submittedPlans,
              s.inPreparationPlans,
              s.approvedPlans,
              s.rejectedPlans,
              s.completedPlans
            ],
            backgroundColor: [
              'rgba(58, 146, 130, 0.82)',
              'rgba(248, 154, 63, 0.82)',
              'rgba(58, 146, 130, 0.92)',
              'rgba(214, 73, 86, 0.78)',
              'rgba(47, 159, 141, 0.92)'
            ],
            borderRadius: 10,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1b3145',
            titleColor: '#a8c0d0',
            bodyColor: '#ffffff',
            padding: 12,
            cornerRadius: 10
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6b8396', font: { size: 12, weight: 'bold' } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(203, 213, 225, 0.35)' },
            ticks: { color: '#6b8396', precision: 0 }
          }
        }
      }
    });
  }

  private drawDoughnutChart(): void {
    if (!this.doughnutCanvas) {
      return;
    }

    const ctx = this.doughnutCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    if (this.doughnutChart) {
      this.doughnutChart.destroy();
    }

    const s = this.stats as TransitDashboardModel;
    this.doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Published', 'Scheduled', 'Draft', 'Archived'],
        datasets: [
          {
            data: [
              s.publishedDestinations,
              s.scheduledDestinations,
              s.draftDestinations,
              s.archivedDestinations
            ],
            backgroundColor: ['#3a9282', '#f89a3f', '#688096', '#b0c4d4'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#355066',
              font: { size: 12, weight: 'bold' },
              padding: 14,
              usePointStyle: true,
              pointStyleWidth: 10
            }
          },
          tooltip: {
            backgroundColor: '#1b3145',
            titleColor: '#a8c0d0',
            bodyColor: '#ffffff',
            padding: 12,
            cornerRadius: 10
          }
        }
      }
    });
  }
}
