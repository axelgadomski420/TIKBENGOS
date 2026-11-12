package com.elif.services.events.implementations;

import com.elif.dto.events.response.EventStatsResponse;
import com.elif.dto.events.response.EventSummaryResponse;
import com.elif.entities.events.EventStatus;
import com.elif.entities.events.ParticipantStatus;
import com.elif.repositories.events.EventParticipantRepository;
import com.elif.repositories.events.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service de statistiques admin.
 * Toutes les requêtes sont en lecture seule et utilisent des requêtes JPQL
 * agrégées pour éviter les problèmes N+1.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class EventStatsService {

    private final EventRepository            eventRepository;
    private final EventParticipantRepository participantRepository;

    public EventStatsResponse getAdminStats() {

        // ─── Totaux globaux ───────────────────────────────────────────
        long totalEvents       = eventRepository.count();
        long totalParticipants = eventRepository.countTotalParticipants(ParticipantStatus.CONFIRMED);

        List<EventStatus> activeStatuses =
                List.of(EventStatus.PLANNED, EventStatus.FULL, EventStatus.ONGOING);
        Double fillRate = eventRepository.getAverageFillRate(activeStatuses);

        // ─── Cette semaine (lundi → dimanche) ─────────────────────────
        LocalDateTime weekStart = LocalDateTime.now()
                .with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime weekEnd = weekStart.plusDays(7);
        long eventsThisWeek = eventRepository.countEventsCreatedBetween(weekStart, weekEnd);

        // ─── Ce mois ──────────────────────────────────────────────────
        LocalDateTime monthStart = LocalDateTime.now()
                .withDayOfMonth(1)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime monthEnd = monthStart.plusMonths(1);
        long eventsThisMonth = eventRepository.countEventsCreatedBetween(monthStart, monthEnd);

        // ─── Répartition par statut ────────────────────────────────────
        Map<String, Long> byStatus = new LinkedHashMap<>();
        eventRepository.countEventsByStatus()
                .forEach(row -> byStatus.put(row[0].toString(), (Long) row[1]));

        // ─── Répartition par catégorie ─────────────────────────────────
        Map<String, Long> byCategory = new LinkedHashMap<>();
        eventRepository.countEventsByCategory()
                .forEach(row -> byCategory.put(row[0].toString(), (Long) row[1]));

        // ─── Tendance mensuelle (12 derniers mois) ─────────────────────
        Map<String, Long> monthlyTrend = buildMonthlyTrend();

        // ─── Top 5 événements (les plus remplis) ──────────────────────
        // ✅ FIX : On passe PageRequest au repository, pas besoin de stream().limit()
        List<EventSummaryResponse> topEvents = eventRepository
                .findTop5Events(PageRequest.of(0, 5))
                .stream()
                .map(e -> EventSummaryResponse.builder()
                        .id(e.getId())
                        .title(e.getTitle())
                        .location(e.getLocation())
                        .startDate(e.getStartDate())
                        .endDate(e.getEndDate())
                        .maxParticipants(e.getMaxParticipants())
                        .remainingSlots(e.getRemainingSlots())
                        .coverImageUrl(e.getCoverImageUrl())
                        .status(e.getStatus())
                        .organizerName(e.getCreatedBy() != null
                                ? e.getCreatedBy().getFirstName() + " " + e.getCreatedBy().getLastName()
                                : null)
                        .averageRating(0.0)
                        .reviewCount(0)
                        .build())
                .collect(Collectors.toList());

        return EventStatsResponse.builder()
                .totalEvents(totalEvents)
                .totalParticipants(totalParticipants)
                .eventsThisWeek(eventsThisWeek)
                .eventsThisMonth(eventsThisMonth)
                .averageFillRate(fillRate != null ? Math.round(fillRate * 10.0) / 10.0 : 0.0)
                .eventsByStatus(byStatus)
                .eventsByCategory(byCategory)
                .monthlyTrend(monthlyTrend)
                .topEvents(topEvents)
                .build();
    }

    /**
     * Construit une map "YYYY-MM" → nombre d'événements sur les 12 derniers mois.
     * Utilisé pour le graphe de tendance du dashboard.
     */
    private Map<String, Long> buildMonthlyTrend() {
        Map<String, Long> trend = new LinkedHashMap<>();
        LocalDateTime cursor = LocalDateTime.now()
                .withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0)
                .minusMonths(11); // 12 mois en arrière

        for (int i = 0; i < 12; i++) {
            LocalDateTime start = cursor.plusMonths(i);
            LocalDateTime end   = start.plusMonths(1);
            long count = eventRepository.countEventsCreatedBetween(start, end);
            // Clé format "2024-04"
            trend.put(start.getYear() + "-" + String.format("%02d", start.getMonthValue()), count);
        }
        return trend;
    }
}
