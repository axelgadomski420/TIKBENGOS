package com.elif.dto.events.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class EventStatsResponse {
    private long                      totalEvents;
    private long                      totalParticipants;
    private long                      eventsThisWeek;
    /** ✅ NOUVEAU : événements créés ce mois */
    private long                      eventsThisMonth;
    private double                    averageFillRate;
    private Map<String, Long>         eventsByStatus;
    private Map<String, Long>         eventsByCategory;
    /** ✅ NOUVEAU : tendance sur 12 mois ("2024-04" → count) */
    private Map<String, Long>         monthlyTrend;
    private List<EventSummaryResponse> topEvents;
}
