package com.elif.dto.marketplace;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryForecastReportResponse {
    private String dateGenerated;
    private String forecastPeriod;

    private List<StockAlert> criticalAlerts;
    private List<ReorderRecommendation> reorderRecommendations;
    private List<OverstockWarning> overstockWarnings;

    private TrendInsights trendInsights;
    private Summary summary;

    private List<ProductForecast> productForecasts;
    private List<String> dataGaps;

    private String reportText;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockAlert {
        private String product;
        private Integer currentStock;
        private Integer daysUntilStockout;
        private String stockoutDate;
        private String urgency;
        private Integer recommendedReorder;
        private String reorderBy;
        private String reasoning;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReorderRecommendation {
        private String product;
        private Integer predictedDemand30Days;
        private Integer suggestedOrderQty;
        private String estimatedReorderDate;
        private String urgency;
        private String reasoning;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverstockWarning {
        private String product;
        private Integer currentStock;
        private Integer predictedDemand90Days;
        private Integer surplus;
        private String suggestion;
        private String reasoning;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendInsights {
        private List<String> rising;
        private List<String> declining;
        private List<String> seasonalOpportunity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private List<String> top5ReorderImmediately;
        private List<String> top5Overstocked;
        private List<String> risingToInvestMore;
        private List<String> decliningToReduce;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductForecast {
        private Long productId;
        private String product;
        private String category;
        private String animalType;
        private Integer currentStock;

        private Integer predictedDemand7Days;
        private Integer predictedDemand30Days;
        private Integer predictedDemand90Days;

        private String trend;
        private String urgency;

        private Integer suggestedOrderQty;
        private String reorderBy;
        private String stockoutDate;
        private Integer daysUntilStockout;

        private String reasoning;
    }
}
