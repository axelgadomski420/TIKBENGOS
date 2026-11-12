package com.elif.dto.events.popularity.response;

import java.time.LocalDateTime;

public record PopularEventDTO(
        Long eventId,
        int rank,
        String title,
        String categoryName,
        String categoryIcon,
        LocalDateTime startDate,
        String location,
        long popularityScore,
        long views,
        long clicks,
        long engagement,
        long uniqueViews,
        long totalInteractions,
        long registrations,
        double conversionRate,
        int remainingSlots,
        LocalDateTime lastUpdatedAt
) {}
