package com.elif.services.events.implementations;

import com.elif.dto.events.popularity.response.EventAnalyticsSnapshotDTO;
import com.elif.dto.events.popularity.response.EventPopularityDetailDTO;
import com.elif.dto.events.popularity.response.PopularEventDTO;
import com.elif.dto.events.popularity.response.PopularityDashboardDTO;
import com.elif.entities.events.Event;
import com.elif.entities.events.EventInteraction;
import com.elif.entities.events.EventStatus;
import com.elif.entities.events.InteractionType;
import com.elif.entities.user.User;
import com.elif.repositories.events.EventInteractionRepository;
import com.elif.repositories.events.EventRepository;
import com.elif.services.events.interfaces.IEventAnalyticsService;
import com.elif.services.user.IUserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventAnalyticsService implements IEventAnalyticsService {

    private static final List<EventStatus> RANKED_STATUSES = List.of(
            EventStatus.PLANNED,
            EventStatus.FULL,
            EventStatus.ONGOING,
            EventStatus.COMPLETED
    );

    private final EventRepository eventRepository;
    private final EventInteractionRepository interactionRepository;
    private final IUserService userService;

    @Override
    @Transactional
    public void track(Long eventId, InteractionType type, Long userId, String sessionId, String ipAddress) {
        if (eventId == null || type == null) {
            return;
        }

        if (shouldSkipDuplicate(eventId, type, sessionId)) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        AnalyticsDelta delta = AnalyticsDelta.from(type);
        int updated = eventRepository.applyAnalyticsIncrement(
                eventId,
                delta.views(),
                delta.clicks(),
                delta.engagement(),
                delta.registrations(),
                delta.score(),
                now
        );

        if (updated == 0) {
            throw new EntityNotFoundException("Event not found for analytics tracking: " + eventId);
        }

        EventInteraction interaction = EventInteraction.builder()
                .event(eventRepository.getReferenceById(eventId))
                .user(resolveUser(userId))
                .type(type)
                .sessionId(normalizeSessionId(sessionId))
                .ipAddress(normalizeIp(ipAddress))
                .build();

        interactionRepository.save(interaction);
        invalidateCache();
    }

    @Override
    @Async
    @Transactional
    public void trackAsync(Long eventId, InteractionType type, Long userId, String sessionId, String ipAddress) {
        try {
            track(eventId, type, userId, sessionId, ipAddress);
        } catch (Exception exception) {
            log.warn("Non-blocking analytics tracking failed for event {}: {}", eventId, exception.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "popularityTop", key = "#limit + '_' + #period")
    public List<PopularEventDTO> getTopPopularEvents(int limit, Period period) {
        LocalDateTime since = LocalDateTime.now().minus(period);
        List<Object[]> rawScores = interactionRepository.findPopularityScoresSince(since);
        if (rawScores.isEmpty()) {
            return List.of();
        }

        Map<Long, Long> scoreByEventId = new LinkedHashMap<>();
        for (Object[] row : rawScores) {
            Long eventId = (Long) row[0];
            long score = row[1] == null ? 0L : ((Number) row[1]).longValue();
            scoreByEventId.put(eventId, score);
        }

        Map<Long, Event> eventsById = eventRepository.findAllById(scoreByEventId.keySet()).stream()
                .collect(Collectors.toMap(Event::getId, event -> event));

        List<PopularEventDTO> ranking = new ArrayList<>();
        int rank = 1;
        for (Map.Entry<Long, Long> entry : scoreByEventId.entrySet()) {
            if (ranking.size() >= limit) {
                break;
            }
            Event event = eventsById.get(entry.getKey());
            if (event == null) {
                continue;
            }
            ranking.add(toPopularEvent(event, rank++, entry.getValue(), since));
        }
        return ranking;
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "popularityLive", key = "#limit")
    public List<PopularEventDTO> getLiveRanking(int limit) {
        List<Event> ranked = eventRepository.findTopRankedEvents(RANKED_STATUSES, PageRequest.of(0, Math.max(1, limit)));
        List<PopularEventDTO> items = new ArrayList<>();
        int rank = 1;
        for (Event event : ranked) {
            items.add(toPopularEvent(event, rank++, safe(event.getAnalyticsPopularityScore()), LocalDateTime.MIN));
        }
        return items;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PopularEventDTO> getNeglectedEvents(int limit, long threshold) {
        List<Event> events = interactionRepository.findNeglectedEvents(LocalDateTime.now(), threshold, PageRequest.of(0, Math.max(1, limit)));
        List<PopularEventDTO> items = new ArrayList<>();
        int rank = 1;
        for (Event event : events) {
            items.add(toPopularEvent(event, rank++, safe(event.getAnalyticsPopularityScore()), LocalDateTime.MIN));
        }
        return items;
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable("popularityDashboard")
    public PopularityDashboardDTO getAdminDashboard() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime since30Days = now.minusDays(30);
        LocalDateTime since7Days = now.minusDays(7);
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();

        Map<String, Long> interactionsLastWeek = buildTypeMap(interactionRepository.countByTypeSince(since7Days));
        Map<String, Long> interactionsToday = buildTypeMap(interactionRepository.countByTypeSince(startOfDay));

        List<PopularEventDTO> topEvents = getTopPopularEvents(10, Period.ofDays(30));
        List<PopularEventDTO> liveRanking = getLiveRanking(10);
        List<PopularEventDTO> neglectedEvents = getNeglectedEvents(10, 10L);

        double averageConversionRate = liveRanking.stream()
                .mapToDouble(PopularEventDTO::conversionRate)
                .filter(value -> value > 0)
                .average()
                .orElse(0.0);

        return new PopularityDashboardDTO(
                topEvents,
                liveRanking,
                neglectedEvents,
                interactionsLastWeek,
                interactionsToday.getOrDefault(InteractionType.VIEW.name(), 0L),
                interactionsToday.getOrDefault(InteractionType.SEARCH_CLICK.name(), 0L)
                        + interactionsToday.getOrDefault(InteractionType.DETAIL_OPEN.name(), 0L),
                interactionsToday.getOrDefault(InteractionType.WAITLIST_JOIN.name(), 0L)
                        + interactionsToday.getOrDefault(InteractionType.REVIEW_POSTED.name(), 0L)
                        + interactionsToday.getOrDefault(InteractionType.REGISTRATION.name(), 0L),
                interactionRepository.countByCreatedAtAfter(since7Days),
                roundOneDecimal(averageConversionRate),
                new PopularityDashboardDTO.PopularityPeriod(since30Days, now, "Last 30 days"),
                now
        );
    }

    @Override
    @Transactional(readOnly = true)
    public EventPopularityDetailDTO getEventPopularityDetail(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found: " + eventId));

        long totalViews = interactionRepository.countByEventIdAndType(eventId, InteractionType.VIEW);
        long uniqueViews = interactionRepository.countUniqueViewsSince(eventId, LocalDateTime.MIN);
        long searchClicks = interactionRepository.countByEventIdAndType(eventId, InteractionType.SEARCH_CLICK);
        long detailOpens = interactionRepository.countByEventIdAndType(eventId, InteractionType.DETAIL_OPEN);
        long waitlistJoins = interactionRepository.countByEventIdAndType(eventId, InteractionType.WAITLIST_JOIN);
        long registrations = interactionRepository.countByEventIdAndType(eventId, InteractionType.REGISTRATION);
        long reviewsPosted = interactionRepository.countByEventIdAndType(eventId, InteractionType.REVIEW_POSTED);
        long totalClicks = searchClicks + detailOpens;
        long engagement = safe(event.getAnalyticsEngagement());

        return new EventPopularityDetailDTO(
                eventId,
                event.getTitle(),
                totalViews,
                uniqueViews,
                totalClicks,
                searchClicks,
                detailOpens,
                waitlistJoins,
                registrations,
                reviewsPosted,
                engagement,
                computeConversionRate(eventId),
                safe(event.getAnalyticsPopularityScore()),
                computeTrend(eventId),
                findLiveRank(eventId),
                event.getAnalyticsLastUpdatedAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public EventAnalyticsSnapshotDTO getEventAnalyticsSnapshot(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found: " + eventId));

        return new EventAnalyticsSnapshotDTO(
                event.getId(),
                event.getTitle(),
                safe(event.getAnalyticsViews()),
                safe(event.getAnalyticsClicks()),
                safe(event.getAnalyticsEngagement()),
                safe(event.getAnalyticsRegistrations()),
                safe(event.getAnalyticsPopularityScore()),
                findLiveRank(eventId),
                event.getAnalyticsLastUpdatedAt()
        );
    }

    @Override
    @CacheEvict(value = {"popularityTop", "popularityLive", "popularityDashboard"}, allEntries = true)
    public void invalidateCache() {
    }

    @Override
    @Transactional
    public int cleanOldInteractions(int monthsToKeep) {
        int deleted = interactionRepository.deleteOlderThan(LocalDateTime.now().minusMonths(monthsToKeep));
        invalidateCache();
        return deleted;
    }

    @Override
    @Transactional
    public void recalculateAllScores() {
        List<Event> events = eventRepository.findAll();
        for (Event event : events) {
            long views = interactionRepository.countByEventIdAndType(event.getId(), InteractionType.VIEW);
            long searchClicks = interactionRepository.countByEventIdAndType(event.getId(), InteractionType.SEARCH_CLICK);
            long detailOpens = interactionRepository.countByEventIdAndType(event.getId(), InteractionType.DETAIL_OPEN);
            long waitlistJoins = interactionRepository.countByEventIdAndType(event.getId(), InteractionType.WAITLIST_JOIN);
            long reviewsPosted = interactionRepository.countByEventIdAndType(event.getId(), InteractionType.REVIEW_POSTED);
            long registrations = interactionRepository.countByEventIdAndType(event.getId(), InteractionType.REGISTRATION);

            long clicks = searchClicks + detailOpens;
            long engagement = detailOpens * 2 + waitlistJoins * 3 + reviewsPosted * 4 + registrations * 5 + searchClicks;
            long score = scoreFor(InteractionType.VIEW, views)
                    + scoreFor(InteractionType.SEARCH_CLICK, searchClicks)
                    + scoreFor(InteractionType.DETAIL_OPEN, detailOpens)
                    + scoreFor(InteractionType.WAITLIST_JOIN, waitlistJoins)
                    + scoreFor(InteractionType.REVIEW_POSTED, reviewsPosted)
                    + scoreFor(InteractionType.REGISTRATION, registrations);

            event.setAnalyticsViews(views);
            event.setAnalyticsClicks(clicks);
            event.setAnalyticsEngagement(engagement);
            event.setAnalyticsRegistrations(registrations);
            event.setAnalyticsPopularityScore(score);
            event.setAnalyticsLastUpdatedAt(LocalDateTime.now());
        }
        eventRepository.saveAll(events);
        invalidateCache();
    }

    private boolean shouldSkipDuplicate(Long eventId, InteractionType type, String sessionId) {
        String normalizedSessionId = normalizeSessionId(sessionId);
        if (normalizedSessionId == null) {
            return false;
        }
        if (type == InteractionType.VIEW) {
            return interactionRepository.existsByEventIdAndSessionIdAndTypeAndCreatedAtAfter(
                    eventId,
                    normalizedSessionId,
                    InteractionType.VIEW,
                    LocalDateTime.now().minusHours(1)
            );
        }
        if (type == InteractionType.DETAIL_OPEN) {
            return interactionRepository.existsByEventIdAndSessionIdAndTypeAndCreatedAtAfter(
                    eventId,
                    normalizedSessionId,
                    InteractionType.DETAIL_OPEN,
                    LocalDateTime.now().minusSeconds(30)
            );
        }
        return false;
    }

    private User resolveUser(Long userId) {
        if (userId == null) {
            return null;
        }
        try {
            return userService.findUser(userId);
        } catch (Exception exception) {
            log.debug("Analytics tracking could not resolve user {}: {}", userId, exception.getMessage());
            return null;
        }
    }

    private String normalizeSessionId(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        return sessionId.trim();
    }

    private String normalizeIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return null;
        }
        return ipAddress.trim();
    }

    private PopularEventDTO toPopularEvent(Event event, int rank, long periodScore, LocalDateTime since) {
        long totalInteractions = since.equals(LocalDateTime.MIN)
                ? interactionRepository.countByEventId(event.getId())
                : interactionRepository.countByEventIdAndCreatedAtAfter(event.getId(), since);

        return new PopularEventDTO(
                event.getId(),
                rank,
                event.getTitle(),
                event.getCategory() != null ? event.getCategory().getName() : "Uncategorized",
                event.getCategory() != null ? defaultString(event.getCategory().getIcon()) : "",
                event.getStartDate(),
                defaultString(event.getLocation()),
                periodScore,
                safe(event.getAnalyticsViews()),
                safe(event.getAnalyticsClicks()),
                safe(event.getAnalyticsEngagement()),
                interactionRepository.countUniqueViewsSince(event.getId(), since.equals(LocalDateTime.MIN) ? LocalDateTime.MIN : since),
                totalInteractions,
                safe(event.getAnalyticsRegistrations()),
                computeConversionRate(event.getId()),
                event.getRemainingSlots() == null ? 0 : event.getRemainingSlots(),
                event.getAnalyticsLastUpdatedAt()
        );
    }

    private Map<String, Long> buildTypeMap(List<Object[]> rows) {
        Map<String, Long> values = new LinkedHashMap<>();
        for (InteractionType type : InteractionType.values()) {
            values.put(type.name(), 0L);
        }
        for (Object[] row : rows) {
            if (row[0] instanceof InteractionType type) {
                values.put(type.name(), row[1] == null ? 0L : ((Number) row[1]).longValue());
            }
        }
        return values;
    }

    private double computeConversionRate(Long eventId) {
        Object[] conversion = interactionRepository.findConversionData(eventId);
        if (conversion == null || conversion.length < 2) {
            return 0.0;
        }
        long views = conversion[0] == null ? 0L : ((Number) conversion[0]).longValue();
        long registrations = conversion[1] == null ? 0L : ((Number) conversion[1]).longValue();
        if (views <= 0) {
            return 0.0;
        }
        return roundOneDecimal((double) registrations / views * 100.0);
    }

    private String computeTrend(Long eventId) {
        LocalDateTime now = LocalDateTime.now();
        long recent = computeScoreForPeriod(eventId, now.minusDays(7), now);
        long previous = computeScoreForPeriod(eventId, now.minusDays(14), now.minusDays(7));
        if (previous <= 0) {
            return recent > 0 ? "RISING" : "STABLE";
        }
        double ratio = (double) recent / previous;
        if (ratio >= 1.2d) {
            return "RISING";
        }
        if (ratio <= 0.8d) {
            return "DECLINING";
        }
        return "STABLE";
    }

    private long computeScoreForPeriod(Long eventId, LocalDateTime from, LocalDateTime to) {
        long score = 0L;
        for (InteractionType type : InteractionType.values()) {
            long count = interactionRepository.countByEventIdAndTypeAndCreatedAtBetween(eventId, type, from, to);
            score += scoreFor(type, count);
        }
        return score;
    }

    private long scoreFor(InteractionType type, long count) {
        return count * type.getWeight();
    }

    private Integer findLiveRank(Long eventId) {
        List<Event> ranked = eventRepository.findTopRankedEvents(RANKED_STATUSES, PageRequest.of(0, 250));
        for (int index = 0; index < ranked.size(); index++) {
            if (Objects.equals(ranked.get(index).getId(), eventId)) {
                return index + 1;
            }
        }
        return null;
    }

    private long safe(Long value) {
        return value == null ? 0L : value;
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0d) / 10.0d;
    }

    private record AnalyticsDelta(long views, long clicks, long engagement, long registrations, long score) {
        private static AnalyticsDelta from(InteractionType type) {
            return switch (type) {
                case VIEW -> new AnalyticsDelta(1, 0, 0, 0, type.getWeight());
                case SEARCH_CLICK -> new AnalyticsDelta(0, 1, 1, 0, type.getWeight());
                case DETAIL_OPEN -> new AnalyticsDelta(0, 1, 2, 0, type.getWeight());
                case WAITLIST_JOIN -> new AnalyticsDelta(0, 0, 3, 0, type.getWeight());
                case REVIEW_POSTED -> new AnalyticsDelta(0, 0, 4, 0, type.getWeight());
                case REGISTRATION -> new AnalyticsDelta(0, 0, 5, 1, type.getWeight());
            };
        }
    }
}
