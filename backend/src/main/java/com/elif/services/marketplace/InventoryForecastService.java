package com.elif.services.marketplace;

import com.elif.dto.marketplace.InventoryForecastReportResponse;
import com.elif.dto.marketplace.InventoryForecastRequest;
import com.elif.entities.marketplace.Order;
import com.elif.entities.marketplace.OrderItem;
import com.elif.entities.marketplace.Product;
import com.elif.repositories.marketplace.OrderRepository;
import com.elif.repositories.marketplace.ProductRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class InventoryForecastService implements IInventoryForecastService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    @Override
    public InventoryForecastReportResponse generateForecastReport(InventoryForecastRequest request) {
        InventoryForecastRequest safeRequest = request == null
                ? InventoryForecastRequest.builder().build()
                : request;

        int historyDays = sanitizeInt(safeRequest.getHistoryDays(), 90, 30, 365);
        int defaultLeadTime = sanitizeInt(safeRequest.getDefaultLeadTimeDays(), 14, 1, 120);
        int defaultMinStock = sanitizeInt(safeRequest.getDefaultMinStockThreshold(), 10, 0, 10_000);
        int defaultMaxStock = sanitizeInt(safeRequest.getDefaultMaxStockThreshold(), 250, 1, 100_000);

        Map<Long, Integer> leadTimeByProduct = safeMap(safeRequest.getReorderLeadTimeDays());
        Map<Long, Integer> minStockByProduct = safeMap(safeRequest.getMinStockThresholds());
        Map<Long, Integer> maxStockByProduct = safeMap(safeRequest.getMaxStockThresholds());

        Set<Long> trendBoostProducts = safeLongSet(safeRequest.getTrendingProductIds());
        Set<Long> supplierRiskProducts = safeLongSet(safeRequest.getSupplierRiskProductIds());
        Set<String> upcomingEvents = safeEvents(safeRequest.getUpcomingEvents());

        LocalDate today = LocalDate.now();
        LocalDate historyStart = today.minusDays(historyDays);

        List<Order> allOrders = orderRepository.findAll();
        Map<Long, SalesWindow> salesWindowByProduct = aggregateSales(allOrders, historyStart, today);

        List<String> dataGaps = buildDataGaps(
                salesWindowByProduct,
                safeRequest,
                allOrders,
                historyDays
        );

        List<ProductProjection> projections = productRepository.findAll().stream()
                .map(product -> buildProjection(
                        product,
                        salesWindowByProduct.getOrDefault(product.getId(), new SalesWindow()),
                        today,
                        historyDays,
                        defaultLeadTime,
                        defaultMinStock,
                        defaultMaxStock,
                        leadTimeByProduct,
                        minStockByProduct,
                        maxStockByProduct,
                        trendBoostProducts,
                        supplierRiskProducts,
                        upcomingEvents
                ))
                .sorted(Comparator
                        .comparingInt(ProductProjection::urgencyRank)
                        .thenComparing(p -> p.daysUntilStockout == null ? Integer.MAX_VALUE : p.daysUntilStockout)
                        .thenComparing(ProductProjection::getProductName))
                .toList();

        List<InventoryForecastReportResponse.StockAlert> criticalAlerts = projections.stream()
                .filter(p -> p.daysUntilStockout != null && p.daysUntilStockout <= p.leadTimeDays + 7)
                .map(this::toAlert)
                .toList();

        List<InventoryForecastReportResponse.ReorderRecommendation> reorderRecommendations = projections.stream()
                .filter(p -> p.recommendedReorderQty > 0)
                .sorted(Comparator
                        .comparingInt(ProductProjection::urgencyRank)
                        .thenComparing(ProductProjection::getRecommendedReorderQty, Comparator.reverseOrder())
                        .thenComparing(ProductProjection::getPredicted30Days, Comparator.reverseOrder()))
                .map(this::toReorderRecommendation)
                .toList();

        List<InventoryForecastReportResponse.OverstockWarning> overstockWarnings = projections.stream()
                .filter(p -> p.overstockSurplus > 0)
                .sorted(Comparator.comparing(ProductProjection::getOverstockSurplus, Comparator.reverseOrder()))
                .map(this::toOverstockWarning)
                .toList();

        List<String> risingTrend = projections.stream()
                .filter(p -> "RISING".equals(p.trend))
            .sorted(Comparator.comparing(ProductProjection::getTrendStrength, Comparator.reverseOrder()))
            .map(p -> p.productName + ": about " + p.predicted30Days + " units expected in the next 30 days (" + p.trendStrength + "% up vs last month)")
                .limit(5)
                .toList();

        List<String> decliningTrend = projections.stream()
                .filter(p -> "DECLINING".equals(p.trend))
            .sorted(Comparator.comparing(ProductProjection::getTrendStrength, Comparator.reverseOrder()))
            .map(p -> p.productName + ": about " + p.predicted30Days + " units expected in the next 30 days (" + p.trendStrength + "% down vs last month)")
                .limit(5)
                .toList();

        List<String> seasonalOpportunities = projections.stream()
                .filter(p -> p.seasonalFactor > 1.05)
                .sorted(Comparator.comparing(ProductProjection::getSeasonalFactor, Comparator.reverseOrder()))
            .map(p -> p.productName + ": seasonal demand is elevated (factor x" + formatDouble(p.seasonalFactor) + ")")
                .limit(5)
                .toList();

        InventoryForecastReportResponse.TrendInsights trendInsights = InventoryForecastReportResponse.TrendInsights.builder()
                .rising(risingTrend)
                .declining(decliningTrend)
                .seasonalOpportunity(seasonalOpportunities)
                .build();

        InventoryForecastReportResponse.Summary summary = InventoryForecastReportResponse.Summary.builder()
                .top5ReorderImmediately(reorderRecommendations.stream()
                        .limit(5)
                .map(r -> r.getProduct() + ": order " + r.getSuggestedOrderQty() + " units (" + r.getUrgency().toLowerCase(Locale.ROOT) + " priority)")
                        .toList())
                .top5Overstocked(overstockWarnings.stream()
                        .limit(5)
                .map(o -> o.getProduct() + ": around " + o.getSurplus() + " units above near-term need")
                        .toList())
                .risingToInvestMore(risingTrend.stream().limit(3).toList())
                .decliningToReduce(decliningTrend.stream().limit(3).toList())
                .build();

        List<InventoryForecastReportResponse.ProductForecast> productForecasts = projections.stream()
                .map(this::toProductForecast)
                .toList();

        String reportText = buildReportText(
                today,
                criticalAlerts,
                reorderRecommendations,
                overstockWarnings,
                trendInsights,
                dataGaps,
                summary
        );

        return InventoryForecastReportResponse.builder()
                .dateGenerated(today.format(DATE_FORMAT))
                .forecastPeriod("7 / 30 / 90 days")
                .criticalAlerts(criticalAlerts)
                .reorderRecommendations(reorderRecommendations)
                .overstockWarnings(overstockWarnings)
                .trendInsights(trendInsights)
                .summary(summary)
                .productForecasts(productForecasts)
                .dataGaps(dataGaps)
                .reportText(reportText)
                .build();
    }

    private ProductProjection buildProjection(
            Product product,
            SalesWindow sales,
            LocalDate today,
            int historyDays,
            int defaultLeadTime,
            int defaultMinStock,
            int defaultMaxStock,
            Map<Long, Integer> leadTimeByProduct,
            Map<Long, Integer> minStockByProduct,
            Map<Long, Integer> maxStockByProduct,
            Set<Long> trendBoostProducts,
            Set<Long> supplierRiskProducts,
            Set<String> upcomingEvents
    ) {
        int stock = safeInt(product.getStock());
        int leadTimeDays = sanitizeInt(leadTimeByProduct.get(product.getId()), defaultLeadTime, 1, 120);
        int minStock = sanitizeInt(minStockByProduct.get(product.getId()), defaultMinStock, 0, 10_000);
        int maxStock = sanitizeInt(maxStockByProduct.get(product.getId()), defaultMaxStock, minStock + 1, 100_000);

        Trend trend = determineTrend(sales);
        double trendFactor = switch (trend) {
            case RISING -> 1.08;
            case DECLINING -> 0.92;
            case STAGNANT -> 1.0;
        };

        double baseDailyDemand = computeBaseDailyDemand(sales, historyDays);
        double seasonalFactor = computeSeasonalFactor(product, upcomingEvents, today);
        double externalTrendFactor = trendBoostProducts.contains(product.getId()) ? 1.18 : 1.0;

        double adjustedDailyDemand = Math.max(0.0, baseDailyDemand * trendFactor * seasonalFactor * externalTrendFactor * 1.05);

        int demand7 = toUnits(adjustedDailyDemand, 7);
        int demand30 = toUnits(adjustedDailyDemand, 30);
        int demand90 = toUnits(adjustedDailyDemand, 90);

        Integer daysUntilStockout = adjustedDailyDemand <= 0.0
                ? null
                : Math.max(0, (int) Math.floor(stock / adjustedDailyDemand));

        LocalDate stockoutDate = daysUntilStockout == null ? null : today.plusDays(daysUntilStockout);

        String urgency = resolveUrgency(daysUntilStockout, leadTimeDays);

        double supplyRiskSafetyFactor = supplierRiskProducts.contains(product.getId()) ? 1.30 : 1.15;
        int targetStock = (int) Math.ceil((adjustedDailyDemand * (leadTimeDays + 30)) * supplyRiskSafetyFactor) + minStock;
        targetStock = Math.min(targetStock, maxStock);

        int recommendedReorderQty = Math.max(0, targetStock - stock);
        LocalDate reorderDate = estimateReorderDate(today, stock, adjustedDailyDemand, leadTimeDays, minStock, urgency);

        int overstockReference = Math.max(demand90, minStock);
        int overstockSurplus = stock > Math.ceil(demand90 * 1.35)
                ? Math.max(0, stock - overstockReference)
                : 0;

        String reason = buildReasoning(
                sales,
                trend,
                leadTimeDays,
                seasonalFactor,
                externalTrendFactor,
                supplierRiskProducts.contains(product.getId())
        );

        return ProductProjection.builder()
                .productId(product.getId())
                .productName(product.getName())
                .category(safeString(product.getCategory()))
                .animalType(product.getPetSpecies() == null ? "UNKNOWN" : product.getPetSpecies().name())
                .currentStock(stock)
                .leadTimeDays(leadTimeDays)
                .predicted7Days(demand7)
                .predicted30Days(demand30)
                .predicted90Days(demand90)
                .trend(trend.name())
                .trendStrength(calculateTrendStrength(sales, trend))
                .urgency(urgency)
                .recommendedReorderQty(recommendedReorderQty)
                .reorderDate(reorderDate)
                .daysUntilStockout(daysUntilStockout)
                .stockoutDate(stockoutDate)
                .overstockSurplus(overstockSurplus)
                .seasonalFactor(seasonalFactor)
                .reasoning(reason)
                .build();
    }

    private String buildReasoning(
            SalesWindow sales,
            Trend trend,
            int leadTimeDays,
            double seasonalFactor,
            double externalTrendFactor,
            boolean supplierRisk
    ) {
        StringBuilder reasoning = new StringBuilder();

        if (sales.recent30 == 0 && sales.previous30 == 0) {
            reasoning.append("No recent sales history was found, so this forecast uses conservative assumptions. ");
        } else if (sales.previous30 <= 0) {
            reasoning.append("This product sold ").append(sales.recent30)
                    .append(" units in the last 30 days with little to no prior-month history, suggesting fresh momentum. ");
        } else {
            reasoning.append("This product sold ").append(sales.recent30)
                    .append(" units in the last 30 days versus ").append(sales.previous30)
                    .append(" in the previous 30 days, indicating a ")
                    .append(trend.name().toLowerCase(Locale.ROOT)).append(" pattern. ");
        }

        reasoning.append("Lead time is estimated at ").append(leadTimeDays).append(" days.");

        if (seasonalFactor > 1.01) {
            reasoning.append(" Seasonal demand adjustment: x").append(formatDouble(seasonalFactor)).append(".");
        }

        if (externalTrendFactor > 1.01) {
            reasoning.append(" Additional demand boost applied: x").append(formatDouble(externalTrendFactor)).append(".");
        }

        if (supplierRisk) {
            reasoning.append(" Extra safety stock was included because supplier risk is flagged.");
        }

        return reasoning.toString();
    }

    private String resolveUrgency(Integer daysUntilStockout, int leadTimeDays) {
        if (daysUntilStockout == null) {
            return "NORMAL";
        }

        if (daysUntilStockout <= leadTimeDays) {
            return "CRITICAL";
        }

        if (daysUntilStockout <= leadTimeDays + 7) {
            return "WARNING";
        }

        return "NORMAL";
    }

    private LocalDate estimateReorderDate(
            LocalDate today,
            int currentStock,
            double adjustedDailyDemand,
            int leadTimeDays,
            int minStock,
            String urgency
    ) {
        if ("CRITICAL".equals(urgency)) {
            return today;
        }

        if (adjustedDailyDemand <= 0.0) {
            return currentStock <= minStock ? today : today.plusDays(30);
        }

        int reorderPoint = (int) Math.ceil(adjustedDailyDemand * (leadTimeDays + 7)) + minStock;
        int daysBeforeReorder = (int) Math.floor((currentStock - reorderPoint) / adjustedDailyDemand);

        if (daysBeforeReorder <= 0) {
            return today;
        }

        return today.plusDays(daysBeforeReorder);
    }

    private Map<Long, SalesWindow> aggregateSales(List<Order> orders, LocalDate historyStart, LocalDate today) {
        Map<Long, SalesWindow> windows = new HashMap<>();

        for (Order order : orders) {
            if (order == null || order.getStatus() == Order.OrderStatus.CANCELLED) {
                continue;
            }

            LocalDateTime createdAt = order.getCreatedAt();
            if (createdAt == null) {
                continue;
            }

            LocalDate orderDate = createdAt.toLocalDate();
            if (orderDate.isBefore(historyStart) || orderDate.isAfter(today)) {
                continue;
            }

            long daysAgo = ChronoUnit.DAYS.between(orderDate, today);
            List<OrderItem> items = order.getOrderItems();
            if (items == null) {
                continue;
            }

            for (OrderItem item : items) {
                if (item == null || item.getProductId() == null || item.getQuantity() == null) {
                    continue;
                }

                SalesWindow window = windows.computeIfAbsent(item.getProductId(), ignored -> new SalesWindow());
                int quantity = Math.max(0, item.getQuantity());

                window.total += quantity;

                if (daysAgo < 7) {
                    window.recent7 += quantity;
                }

                if (daysAgo < 30) {
                    window.recent30 += quantity;
                } else if (daysAgo < 60) {
                    window.previous30 += quantity;
                }

                if (daysAgo < 90) {
                    window.recent90 += quantity;
                }
            }
        }

        return windows;
    }

    private double computeBaseDailyDemand(SalesWindow window, int historyDays) {
        if (window.recent30 > 0 || window.previous30 > 0) {
            double recentDaily = window.recent30 / 30.0;
            double previousDaily = window.previous30 / 30.0;
            return (recentDaily * 0.7) + (previousDaily * 0.3);
        }

        if (window.total > 0) {
            return window.total / (double) historyDays;
        }

        return 0.0;
    }

    private Trend determineTrend(SalesWindow window) {
        if (window.previous30 == 0 && window.recent30 > 0) {
            return Trend.RISING;
        }

        if (window.previous30 == 0) {
            return Trend.STAGNANT;
        }

        double ratio = window.recent30 / (double) window.previous30;
        if (ratio >= 1.15) {
            return Trend.RISING;
        }

        if (ratio <= 0.85) {
            return Trend.DECLINING;
        }

        return Trend.STAGNANT;
    }

    private int calculateTrendStrength(SalesWindow window, Trend trend) {
        if (window.previous30 <= 0) {
            return trend == Trend.RISING ? 100 : 0;
        }

        double change = ((window.recent30 - window.previous30) / (double) window.previous30) * 100.0;
        return (int) Math.round(Math.abs(change));
    }

    private double computeSeasonalFactor(Product product, Set<String> upcomingEvents, LocalDate today) {
        String category = safeString(product.getCategory()).toLowerCase(Locale.ROOT);
        String name = safeString(product.getName()).toLowerCase(Locale.ROOT);
        String animal = product.getPetSpecies() == null ? "" : product.getPetSpecies().name().toLowerCase(Locale.ROOT);

        boolean summerContext = isSummer(today) || containsAny(upcomingEvents, "summer", "ete", "hot", "vacation");
        boolean winterContext = isWinter(today) || containsAny(upcomingEvents, "winter", "cold", "hiver");
        boolean ramadanContext = containsAny(upcomingEvents, "ramadan");
        boolean eidContext = containsAny(upcomingEvents, "eid", "aid");

        double factor = 1.0;

        if (summerContext && ("dog".equals(animal) || "cat".equals(animal)) &&
                (category.contains("health") || name.contains("flea") || name.contains("tick") || name.contains("travel"))) {
            factor *= 1.18;
        }

        if ((ramadanContext || eidContext) && (category.contains("food") || category.contains("feed") || name.contains("treat") || name.contains("snack"))) {
            factor *= 1.12;
        }

        if (winterContext && (category.contains("accessories") || name.contains("coat") || name.contains("warm"))) {
            factor *= 1.10;
        }

        if ((today.getMonthValue() >= 3 && today.getMonthValue() <= 6)
                && "bird".equals(animal)
                && (category.contains("food") || category.contains("health"))) {
            factor *= 1.08;
        }

        return factor;
    }

    private boolean isSummer(LocalDate date) {
        int month = date.getMonthValue();
        return month >= 5 && month <= 8;
    }

    private boolean isWinter(LocalDate date) {
        int month = date.getMonthValue();
        return month == 12 || month <= 2;
    }

    private boolean containsAny(Set<String> values, String... candidates) {
        for (String candidate : candidates) {
            if (values.contains(candidate.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private List<String> buildDataGaps(
            Map<Long, SalesWindow> salesWindowByProduct,
            InventoryForecastRequest request,
            List<Order> allOrders,
            int historyDays
    ) {
        List<String> gaps = new ArrayList<>();

        long usableOrders = allOrders.stream()
                .filter(o -> o != null && o.getStatus() != Order.OrderStatus.CANCELLED && o.getCreatedAt() != null)
                .count();

        if (usableOrders == 0 || salesWindowByProduct.isEmpty()) {
            gaps.add("No non-cancelled order history found for the last " + historyDays + " days. Forecast confidence is low.");
        }

        if (request.getReorderLeadTimeDays() == null || request.getReorderLeadTimeDays().isEmpty()) {
            gaps.add("Per-product lead times are missing; default lead time was applied.");
        }

        if (request.getMinStockThresholds() == null || request.getMinStockThresholds().isEmpty()) {
            gaps.add("Per-product minimum stock thresholds are missing; default minimum threshold was applied.");
        }

        if (request.getMaxStockThresholds() == null || request.getMaxStockThresholds().isEmpty()) {
            gaps.add("Per-product maximum stock thresholds are missing; default maximum threshold was applied.");
        }

        if (request.getUpcomingEvents() == null || request.getUpcomingEvents().isEmpty()) {
            gaps.add("Upcoming event list was not provided; only calendar seasonality was used.");
        }

        if (request.getSupplierRiskProductIds() == null || request.getSupplierRiskProductIds().isEmpty()) {
            gaps.add("Supplier availability issues were not provided; no supplier risk buffer was targeted to specific products.");
        }

        gaps.add("Price history and discount history are not stored per timestamp in the current schema, so price-elasticity effects are approximated.");

        return gaps;
    }

    private String buildReportText(
            LocalDate today,
            List<InventoryForecastReportResponse.StockAlert> criticalAlerts,
            List<InventoryForecastReportResponse.ReorderRecommendation> reorderRecommendations,
            List<InventoryForecastReportResponse.OverstockWarning> overstockWarnings,
            InventoryForecastReportResponse.TrendInsights trendInsights,
            List<String> dataGaps,
            InventoryForecastReportResponse.Summary summary
    ) {
        StringBuilder builder = new StringBuilder();
        builder.append("Inventory Demand Forecast\n");
        builder.append("=========================\n");
        builder.append("Generated on: ").append(today.format(DATE_FORMAT)).append("\n");
        builder.append("Prediction windows: 7 / 30 / 90 days\n\n");

        builder.append("1) Immediate Stock Alerts\n");
        if (criticalAlerts.isEmpty()) {
            builder.append("- Great news: no immediate stockout risks detected.\n\n");
        } else {
            for (InventoryForecastReportResponse.StockAlert alert : criticalAlerts) {
                builder.append("- Product: ").append(alert.getProduct()).append("\n");
                builder.append("  In stock now: ").append(alert.getCurrentStock()).append(" units\n");
                builder.append("  Days before stockout: ").append(alert.getDaysUntilStockout() == null ? "N/A" : alert.getDaysUntilStockout()).append("\n");
                builder.append("  Suggested reorder now: ").append(alert.getRecommendedReorder()).append(" units\n");
                builder.append("  Target reorder date: ").append(alert.getReorderBy()).append("\n");
                builder.append("  Why this is flagged: ").append(alert.getReasoning()).append("\n");
            }
            builder.append("\n");
        }

        builder.append("2) Reorder Suggestions\n");
        if (reorderRecommendations.isEmpty()) {
            builder.append("- No urgent reorders are needed right now.\n\n");
        } else {
            for (InventoryForecastReportResponse.ReorderRecommendation recommendation : reorderRecommendations) {
                builder.append("- Product: ").append(recommendation.getProduct()).append("\n");
                builder.append("  Expected demand (next 30 days): ").append(recommendation.getPredictedDemand30Days()).append(" units\n");
                builder.append("  Suggested order quantity: ").append(recommendation.getSuggestedOrderQty()).append(" units\n");
                builder.append("  Suggested reorder date: ").append(recommendation.getEstimatedReorderDate()).append("\n");
                builder.append("  Why: ").append(recommendation.getReasoning()).append("\n");
            }
            builder.append("\n");
        }

        builder.append("3) Inventory To Trim (Overstock)\n");
        if (overstockWarnings.isEmpty()) {
            builder.append("- No overstock pressure detected right now.\n\n");
        } else {
            for (InventoryForecastReportResponse.OverstockWarning overstock : overstockWarnings) {
                builder.append("- Product: ").append(overstock.getProduct()).append("\n");
                builder.append("  In stock now: ").append(overstock.getCurrentStock()).append(" units\n");
                builder.append("  Expected demand (next 90 days): ").append(overstock.getPredictedDemand90Days()).append(" units\n");
                builder.append("  Estimated surplus: ").append(overstock.getSurplus()).append(" units\n");
                builder.append("  Suggested action: ").append(overstock.getSuggestion()).append("\n");
                builder.append("  Why: ").append(overstock.getReasoning()).append("\n");
            }
            builder.append("\n");
        }

        builder.append("4) Demand Momentum\n");
        builder.append("- Growing: ")
                .append(trendInsights.getRising().isEmpty() ? "None" : String.join(" | ", trendInsights.getRising()))
                .append("\n");
        builder.append("- Slowing: ")
                .append(trendInsights.getDeclining().isEmpty() ? "None" : String.join(" | ", trendInsights.getDeclining()))
                .append("\n");
        builder.append("- Seasonal opportunities: ")
                .append(trendInsights.getSeasonalOpportunity().isEmpty() ? "None" : String.join(" | ", trendInsights.getSeasonalOpportunity()))
                .append("\n\n");

        builder.append("5) Quick Decision Summary\n");
        builder.append("- Top 5 products to reorder now: ")
                .append(summary.getTop5ReorderImmediately().isEmpty() ? "None" : String.join(" | ", summary.getTop5ReorderImmediately()))
                .append("\n");
        builder.append("- Top 5 overstocked products: ")
                .append(summary.getTop5Overstocked().isEmpty() ? "None" : String.join(" | ", summary.getTop5Overstocked()))
                .append("\n");
        builder.append("- 3 growing products worth backing: ")
                .append(summary.getRisingToInvestMore().isEmpty() ? "None" : String.join(" | ", summary.getRisingToInvestMore()))
                .append("\n");
        builder.append("- 3 slowing products to reduce orders for: ")
                .append(summary.getDecliningToReduce().isEmpty() ? "None" : String.join(" | ", summary.getDecliningToReduce()))
                .append("\n\n");

        if (!dataGaps.isEmpty()) {
            builder.append("6) Confidence Notes\n");
            for (String gap : dataGaps) {
                builder.append("- ").append(gap).append("\n");
            }
        }

        return builder.toString();
    }

    private InventoryForecastReportResponse.StockAlert toAlert(ProductProjection projection) {
        return InventoryForecastReportResponse.StockAlert.builder()
                .product(projection.productName)
                .currentStock(projection.currentStock)
                .daysUntilStockout(projection.daysUntilStockout)
                .stockoutDate(formatDate(projection.stockoutDate))
                .urgency(projection.urgency)
                .recommendedReorder(projection.recommendedReorderQty)
                .reorderBy(formatDate(projection.reorderDate))
                .reasoning(projection.reasoning)
                .build();
    }

    private InventoryForecastReportResponse.ReorderRecommendation toReorderRecommendation(ProductProjection projection) {
        return InventoryForecastReportResponse.ReorderRecommendation.builder()
                .product(projection.productName)
                .predictedDemand30Days(projection.predicted30Days)
                .suggestedOrderQty(projection.recommendedReorderQty)
                .estimatedReorderDate(formatDate(projection.reorderDate))
                .urgency(projection.urgency)
                .reasoning(projection.reasoning)
                .build();
    }

    private InventoryForecastReportResponse.OverstockWarning toOverstockWarning(ProductProjection projection) {
        return InventoryForecastReportResponse.OverstockWarning.builder()
                .product(projection.productName)
                .currentStock(projection.currentStock)
                .predictedDemand90Days(projection.predicted90Days)
                .surplus(projection.overstockSurplus)
                .suggestion("Run a promotion or pause reorders")
                .reasoning(projection.reasoning)
                .build();
    }

    private InventoryForecastReportResponse.ProductForecast toProductForecast(ProductProjection projection) {
        return InventoryForecastReportResponse.ProductForecast.builder()
                .productId(projection.productId)
                .product(projection.productName)
                .category(projection.category)
                .animalType(projection.animalType)
                .currentStock(projection.currentStock)
                .predictedDemand7Days(projection.predicted7Days)
                .predictedDemand30Days(projection.predicted30Days)
                .predictedDemand90Days(projection.predicted90Days)
                .trend(projection.trend)
                .urgency(projection.urgency)
                .suggestedOrderQty(projection.recommendedReorderQty)
                .reorderBy(formatDate(projection.reorderDate))
                .stockoutDate(formatDate(projection.stockoutDate))
                .daysUntilStockout(projection.daysUntilStockout)
                .reasoning(projection.reasoning)
                .build();
    }

    private int toUnits(double dailyDemand, int days) {
        return (int) Math.ceil(Math.max(0.0, dailyDemand) * days);
    }

    private int sanitizeInt(Integer value, int fallback, int min, int max) {
        int resolved = value == null ? fallback : value;
        if (resolved < min) {
            return min;
        }
        if (resolved > max) {
            return max;
        }
        return resolved;
    }

    private Map<Long, Integer> safeMap(Map<Long, Integer> source) {
        if (source == null) {
            return Collections.emptyMap();
        }

        Map<Long, Integer> copy = new HashMap<>();
        source.forEach((key, value) -> {
            if (key != null && value != null) {
                copy.put(key, value);
            }
        });

        return copy;
    }

    private Set<Long> safeLongSet(List<Long> values) {
        if (values == null || values.isEmpty()) {
            return Collections.emptySet();
        }

        return values.stream()
                .filter(v -> v != null && v > 0)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private Set<String> safeEvents(List<String> events) {
        if (events == null || events.isEmpty()) {
            return Collections.emptySet();
        }

        return events.stream()
                .filter(event -> event != null && !event.isBlank())
                .map(event -> event.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private String formatDate(LocalDate date) {
        return date == null ? "N/A" : date.format(DATE_FORMAT);
    }

    private String formatDouble(double value) {
        return String.format(Locale.ROOT, "%.2f", value);
    }

    private enum Trend {
        RISING,
        DECLINING,
        STAGNANT
    }

    private static class SalesWindow {
        int recent7;
        int recent30;
        int previous30;
        int recent90;
        int total;
    }

    @lombok.Data
    @lombok.Builder
    private static class ProductProjection {
        private Long productId;
        private String productName;
        private String category;
        private String animalType;

        private Integer currentStock;
        private Integer leadTimeDays;

        private Integer predicted7Days;
        private Integer predicted30Days;
        private Integer predicted90Days;

        private String trend;
        private Integer trendStrength;
        private String urgency;

        private Integer recommendedReorderQty;
        private LocalDate reorderDate;

        private Integer daysUntilStockout;
        private LocalDate stockoutDate;

        private Integer overstockSurplus;
        private Double seasonalFactor;
        private String reasoning;

        int urgencyRank() {
            return switch (urgency) {
                case "CRITICAL" -> 0;
                case "WARNING" -> 1;
                default -> 2;
            };
        }
    }
}
