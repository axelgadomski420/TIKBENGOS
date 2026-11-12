package com.elif.dto.events.popularity.response;

import java.time.LocalDateTime;

public record EventAnalyticsSnapshotDTO(
        Long eventId,
        String title,
        long views,
        long clicks,
        long engagement,
        long registrations,
        long popularityScore,
        Integer liveRank,
        LocalDateTime lastUpdatedAt
) {}
