package com.elif.dto.events.popularity.response;

import java.time.LocalDateTime;

public record EventPopularityDetailDTO(
        Long eventId,
        String title,
        long totalViews,
        long uniqueViews,
        long totalClicks,
        long searchClicks,
        long detailOpens,
        long waitlistJoins,
        long registrations,
        long reviewsPosted,
        long engagement,
        double conversionRate,
        long popularityScore,
        String trend,
        Integer liveRank,
        LocalDateTime lastUpdatedAt
) {}
