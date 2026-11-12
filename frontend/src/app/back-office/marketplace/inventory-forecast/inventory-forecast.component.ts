import { Component, OnInit } from '@angular/core';
import {
  InventoryForecastReport,
  InventoryForecastRequestPayload,
  InventoryForecastService
} from '../../../shared/services/inventory-forecast.service';
import { ToastrService } from '../../../shared/services/toastr.service';

@Component({
  selector: 'app-marketplace-inventory-forecast',
  templateUrl: './inventory-forecast.component.html',
  styleUrl: './inventory-forecast.component.css'
})
export class InventoryForecastComponent implements OnInit {
  loading = false;
  error = '';
  report: InventoryForecastReport | null = null;
  overstockActions: Record<string, 'DISCOUNT' | 'PAUSE'> = {};

  historyDays = 90;
  defaultLeadTimeDays = 14;
  defaultMinStockThreshold = 10;
  defaultMaxStockThreshold = 300;

  upcomingEventsInput = 'summer,eid';
  trendingProductIdsInput = '';
  supplierRiskProductIdsInput = '';

  constructor(
    private readonly inventoryForecastService: InventoryForecastService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.generateReport();
  }

  get criticalCount(): number {
    return this.report?.criticalAlerts.length || 0;
  }

  get reorderCount(): number {
    return this.report?.reorderRecommendations.length || 0;
  }

  get overstockCount(): number {
    return this.report?.overstockWarnings.length || 0;
  }

  get productsAnalyzed(): number {
    return this.report?.productForecasts.length || 0;
  }

  get hasReport(): boolean {
    return !!this.report;
  }

  urgencyClass(urgency: string): string {
    switch (urgency) {
      case 'CRITICAL':
        return 'forecast-urgency-critical';
      case 'WARNING':
        return 'forecast-urgency-warning';
      default:
        return 'forecast-urgency-normal';
    }
  }

  urgencyLabel(urgency: string): string {
    switch (urgency) {
      case 'CRITICAL':
        return 'Act now';
      case 'WARNING':
        return 'Watch closely';
      default:
        return 'Stable';
    }
  }

  formatDaysUntilStockout(days: number | null): string {
    if (days === null || days === undefined) {
      return 'No immediate stockout risk';
    }

    if (days <= 0) {
      return 'Today';
    }

    return days === 1 ? '1 day' : `${days} days`;
  }

  overstockActionStatus(product: string): string {
    const action = this.currentOverstockAction(product);
    if (!action) {
      return '';
    }

    return action === 'DISCOUNT'
      ? 'Discount plan added for this session'
      : 'Reorder pause noted for this session';
  }

  formatDate(value: string): string {
    if (!value || value === 'N/A') {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString();
  }

  generateReport(): void {
    this.loading = true;
    this.error = '';
    this.overstockActions = {};

    const payload = this.buildRequestPayload();

    this.inventoryForecastService.generateReport(payload).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'We could not generate the forecast right now. Please try again.';
        this.toastr.error(this.error, 'Forecast generation failed');
        this.loading = false;
      }
    });
  }

  setOverstockAction(product: string, action: 'DISCOUNT' | 'PAUSE'): void {
    this.overstockActions[product] = action;
  }

  currentOverstockAction(product: string): 'DISCOUNT' | 'PAUSE' | null {
    return this.overstockActions[product] || null;
  }

  private buildRequestPayload(): InventoryForecastRequestPayload {
    return {
      historyDays: this.clampNumber(this.historyDays, 30, 365, 90),
      defaultLeadTimeDays: this.clampNumber(this.defaultLeadTimeDays, 1, 120, 14),
      defaultMinStockThreshold: this.clampNumber(this.defaultMinStockThreshold, 0, 10000, 10),
      defaultMaxStockThreshold: this.clampNumber(this.defaultMaxStockThreshold, 1, 100000, 300),
      upcomingEvents: this.parseStringCsv(this.upcomingEventsInput),
      trendingProductIds: this.parseNumberCsv(this.trendingProductIdsInput),
      supplierRiskProductIds: this.parseNumberCsv(this.supplierRiskProductIdsInput)
    };
  }

  private parseStringCsv(value: string): string[] {
    if (!value || !value.trim()) {
      return [];
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private parseNumberCsv(value: string): number[] {
    if (!value || !value.trim()) {
      return [];
    }

    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((num) => Number.isFinite(num) && num > 0)
      .map((num) => Math.floor(num));
  }

  private clampNumber(value: number, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(value)) {
      return fallback;
    }

    const normalized = Math.floor(value);
    if (normalized < min) {
      return min;
    }

    if (normalized > max) {
      return max;
    }

    return normalized;
  }
}
