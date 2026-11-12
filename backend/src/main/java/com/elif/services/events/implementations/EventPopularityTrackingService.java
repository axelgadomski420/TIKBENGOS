package com.elif.services.events.implementations;

import com.elif.dto.events.popularity.response.EventPopularityDetailDTO;
import com.elif.dto.events.popularity.response.PopularEventDTO;
import com.elif.dto.events.popularity.response.PopularityDashboardDTO;
import com.elif.entities.events.InteractionType;
import com.elif.services.events.interfaces.IEventAnalyticsService;
import com.elif.services.events.interfaces.IEventPopularityTrackingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Period;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventPopularityTrackingService implements IEventPopularityTrackingService {

    private final IEventAnalyticsService analyticsService;

    @Override
    public void track(Long eventId, InteractionType type, Long userId, String sessionId, String ipAddress) {
        analyticsService.track(eventId, type, userId, sessionId, ipAddress);
    }

    @Override
    public List<PopularEventDTO> getTopPopularEvents(int limit, Period period) {
        return analyticsService.getTopPopularEvents(limit, period);
    }

    @Override
    public List<PopularEventDTO> getNeglectedEvents(int limit, long threshold) {
        return analyticsService.getNeglectedEvents(limit, threshold);
    }

    @Override
    public PopularityDashboardDTO getAdminDashboard() {
        return analyticsService.getAdminDashboard();
    }

    @Override
    public EventPopularityDetailDTO getEventPopularityDetail(Long eventId) {
        return analyticsService.getEventPopularityDetail(eventId);
    }

    @Override
    public void trackAsync(Long eventId, InteractionType type, Long userId, String sessionId, String ipAddress) {
        analyticsService.trackAsync(eventId, type, userId, sessionId, ipAddress);
    }

    @Override
    public void invalidateCache() {
        analyticsService.invalidateCache();
    }

    @Override
    public int cleanOldInteractions(int monthsToKeep) {
        return analyticsService.cleanOldInteractions(monthsToKeep);
    }

    @Override
    public void recalculateAllScores() {
        analyticsService.recalculateAllScores();
    }
}
