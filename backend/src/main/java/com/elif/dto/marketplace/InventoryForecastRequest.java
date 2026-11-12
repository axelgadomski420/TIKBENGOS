package com.elif.dto.marketplace;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryForecastRequest {

    @Builder.Default
    private Integer historyDays = 90;

    @Builder.Default
    private Integer defaultLeadTimeDays = 14;

    @Builder.Default
    private Integer defaultMinStockThreshold = 10;

    @Builder.Default
    private Integer defaultMaxStockThreshold = 250;

    private Map<Long, Integer> reorderLeadTimeDays;
    private Map<Long, Integer> minStockThresholds;
    private Map<Long, Integer> maxStockThresholds;

    private List<String> upcomingEvents;
    private List<Long> trendingProductIds;
    private List<Long> supplierRiskProductIds;
}
