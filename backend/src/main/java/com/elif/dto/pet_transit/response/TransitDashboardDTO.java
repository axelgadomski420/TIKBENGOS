package com.elif.dto.pet_transit.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregated statistics DTO for the Transit admin dashboard.
 * Returned by GET /api/v1/transit/statistics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransitDashboardDTO {

    // ── Destinations ──────────────────────────────────────────────────────────
    private long totalDestinations;
    private long publishedDestinations;
    private long scheduledDestinations;
    private long draftDestinations;
    private long archivedDestinations;

    // ── Travel Plans ──────────────────────────────────────────────────────────
    private long totalTravelPlans;
    private long submittedPlans;
    private long inPreparationPlans;
    private long approvedPlans;
    private long rejectedPlans;
    private long completedPlans;

    // ── Feedback ──────────────────────────────────────────────────────────────
    private long totalFeedback;
    private long reviewCount;
    private long suggestionCount;
    private long incidentCount;
    private long complaintCount;
    private long openFeedback;
    private long resolvedFeedback;
}
