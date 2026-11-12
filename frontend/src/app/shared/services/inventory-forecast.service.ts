import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryForecastRequestPayload {
  historyDays?: number;
  defaultLeadTimeDays?: number;
  defaultMinStockThreshold?: number;
  defaultMaxStockThreshold?: number;
  reorderLeadTimeDays?: Record<number, number>;
  minStockThresholds?: Record<number, number>;
  maxStockThresholds?: Record<number, number>;
  upcomingEvents?: string[];
  trendingProductIds?: number[];
  supplierRiskProductIds?: number[];
}

export interface InventoryForecastStockAlert {
  product: string;
  currentStock: number;
  daysUntilStockout: number | null;
  stockoutDate: string;
  urgency: 'CRITICAL' | 'WARNING' | 'NORMAL';
  recommendedReorder: number;
  reorderBy: string;
  reasoning: string;
}

export interface InventoryForecastReorderRecommendation {
  product: string;
  predictedDemand30Days: number;
  suggestedOrderQty: number;
  estimatedReorderDate: string;
  urgency: 'CRITICAL' | 'WARNING' | 'NORMAL';
  reasoning: string;
}

export interface InventoryForecastOverstockWarning {
  product: string;
  currentStock: number;
  predictedDemand90Days: number;
  surplus: number;
  suggestion: string;
  reasoning: string;
}

export interface InventoryForecastTrendInsights {
  rising: string[];
  declining: string[];
  seasonalOpportunity: string[];
}

export interface InventoryForecastSummary {
  top5ReorderImmediately: string[];
  top5Overstocked: string[];
  risingToInvestMore: string[];
  decliningToReduce: string[];
}

export interface InventoryForecastProductForecast {
  productId: number;
  product: string;
  category: string;
  animalType: string;
  currentStock: number;
  predictedDemand7Days: number;
  predictedDemand30Days: number;
  predictedDemand90Days: number;
  trend: 'RISING' | 'DECLINING' | 'STAGNANT';
  urgency: 'CRITICAL' | 'WARNING' | 'NORMAL';
  suggestedOrderQty: number;
  reorderBy: string;
  stockoutDate: string;
  daysUntilStockout: number | null;
  reasoning: string;
}

export interface InventoryForecastReport {
  dateGenerated: string;
  forecastPeriod: string;
  criticalAlerts: InventoryForecastStockAlert[];
  reorderRecommendations: InventoryForecastReorderRecommendation[];
  overstockWarnings: InventoryForecastOverstockWarning[];
  trendInsights: InventoryForecastTrendInsights;
  summary: InventoryForecastSummary;
  productForecasts: InventoryForecastProductForecast[];
  dataGaps: string[];
  reportText: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryForecastService {
  private readonly api = 'http://localhost:8087/elif/inventory-forecast';

  constructor(private readonly http: HttpClient) {}

  generateReport(payload?: InventoryForecastRequestPayload): Observable<InventoryForecastReport> {
    return this.http.post<InventoryForecastReport>(`${this.api}/report`, payload ?? {});
  }
}
