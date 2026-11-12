package com.elif.services.events.interfaces;

import com.elif.dto.events.popularity.response.EventAnalyticsSnapshotDTO;
import com.elif.dto.events.popularity.response.EventPopularityDetailDTO;
import com.elif.dto.events.popularity.response.PopularEventDTO;
import com.elif.dto.events.popularity.response.PopularityDashboardDTO;
import com.elif.entities.events.InteractionType;

import java.time.Period;
import java.util.List;

public interface IEventAnalyticsService {

    void track(Long eventId, InteractionType type, Long userId, String sessionId, String ipAddress);

    void trackAsync(Long eventId, InteractionType type, Long userId, String sessionId, String ipAddress);

    List<PopularEventDTO> getTopPopularEvents(int limit, Period period);

    List<PopularEventDTO> getLiveRanking(int limit);

    List<PopularEventDTO> getNeglectedEvents(int limit, long threshold);

    PopularityDashboardDTO getAdminDashboard();

    EventPopularityDetailDTO getEventPopularityDetail(Long eventId);

    EventAnalyticsSnapshotDTO getEventAnalyticsSnapshot(Long eventId);

    void invalidateCache();

    int cleanOldInteractions(int monthsToKeep);

    void recalculateAllScores();
}
