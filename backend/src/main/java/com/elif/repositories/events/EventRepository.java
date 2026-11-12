package com.elif.repositories.events;

import com.elif.entities.events.Event;
import com.elif.entities.events.EventStatus;
import com.elif.entities.events.ParticipantStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    Page<Event> findByStatus(EventStatus status, Pageable pageable);

    Page<Event> findByCreatedByIdOrderByStartDateDesc(Long userId, Pageable pageable);

    Page<Event> findByCategoryIdAndStatus(Long categoryId, EventStatus status, Pageable pageable);

    Page<Event> findByCategoryId(Long categoryId, Pageable pageable);

    List<Event> findByStartDateBetween(LocalDateTime start, LocalDateTime end);

    @Query("""
        select e from Event e
        where e.status = :status
          and (lower(e.title) like :keyword or lower(e.description) like :keyword)
        """)
    Page<Event> searchByKeyword(@Param("keyword") String keyword,
                                @Param("status") EventStatus status,
                                Pageable pageable);

    @Query("""
        select e from Event e
        where lower(e.title) like :keyword or lower(e.location) like :keyword
        """)
    Page<Event> searchByKeywordAllStatus(@Param("keyword") String keyword, Pageable pageable);

    @Query("""
        select count(e) > 0 from Event e
        where lower(e.title) = lower(:title)
          and lower(e.location) = lower(:location)
          and e.status != :cancelled
          and e.status != :completed
          and e.startDate < :endDate
          and e.endDate > :startDate
        """)
    boolean existsDuplicate(@Param("title") String title,
                            @Param("location") String location,
                            @Param("startDate") LocalDateTime startDate,
                            @Param("endDate") LocalDateTime endDate,
                            @Param("cancelled") EventStatus cancelled,
                            @Param("completed") EventStatus completed);

    @Query("""
        select e from Event e
        where e.category.id = :categoryId
          and e.id != :excludeEventId
          and e.status = :plannedStatus
          and e.startDate > :now
          and e.remainingSlots > 0
        order by e.startDate asc
        """)
    List<Event> findSuggestedEvents(@Param("categoryId") Long categoryId,
                                    @Param("excludeEventId") Long excludeEventId,
                                    @Param("now") LocalDateTime now,
                                    @Param("plannedStatus") EventStatus plannedStatus,
                                    Pageable pageable);

    @Query("select e from Event e where e.endDate < :now and e.status not in :excludedStatuses")
    List<Event> findEventsToMarkCompleted(@Param("now") LocalDateTime now,
                                          @Param("excludedStatuses") List<EventStatus> excludedStatuses);

    @Query("select e from Event e where e.status in :statuses and e.startDate <= :now")
    List<Event> findEventsToMarkOngoing(@Param("now") LocalDateTime now,
                                        @Param("statuses") List<EventStatus> statuses);

    @Query("select e from Event e where e.endDate < :now and e.status = 'ONGOING'")
    List<Event> findOngoingEventsToComplete(@Param("now") LocalDateTime now);

    @Query("select e.status, count(e) from Event e group by e.status")
    List<Object[]> countEventsByStatus();

    @Query("""
        select e.category.name, count(e)
        from Event e
        where e.category is not null
        group by e.category.name
        order by count(e) desc
        """)
    List<Object[]> countEventsByCategory();

    @Query("select count(e) from Event e where e.startDate >= :start and e.startDate < :end")
    long countEventsCreatedBetween(@Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end);

    @Query("""
        select coalesce(sum(p.numberOfSeats), 0)
        from EventParticipant p
        where p.status = :confirmedStatus
        """)
    long countTotalParticipants(@Param("confirmedStatus") ParticipantStatus confirmedStatus);

    @Query("""
        select avg((1.0 * (e.maxParticipants - e.remainingSlots) / e.maxParticipants) * 100)
        from Event e
        where e.status in :statuses and e.maxParticipants > 0
        """)
    Double getAverageFillRate(@Param("statuses") List<EventStatus> statuses);

    @Query("select e from Event e order by e.remainingSlots asc")
    List<Event> findTop5Events(Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update Event e
        set e.analyticsViews = coalesce(e.analyticsViews, 0) + :viewsDelta,
            e.analyticsClicks = coalesce(e.analyticsClicks, 0) + :clicksDelta,
            e.analyticsEngagement = coalesce(e.analyticsEngagement, 0) + :engagementDelta,
            e.analyticsRegistrations = coalesce(e.analyticsRegistrations, 0) + :registrationsDelta,
            e.analyticsPopularityScore = coalesce(e.analyticsPopularityScore, 0) + :scoreDelta,
            e.analyticsLastUpdatedAt = :updatedAt
        where e.id = :eventId
        """)
    int applyAnalyticsIncrement(@Param("eventId") Long eventId,
                                @Param("viewsDelta") long viewsDelta,
                                @Param("clicksDelta") long clicksDelta,
                                @Param("engagementDelta") long engagementDelta,
                                @Param("registrationsDelta") long registrationsDelta,
                                @Param("scoreDelta") long scoreDelta,
                                @Param("updatedAt") LocalDateTime updatedAt);

    @Query("""
        select e from Event e
        where e.status in :statuses
        order by coalesce(e.analyticsPopularityScore, 0) desc,
                 coalesce(e.analyticsEngagement, 0) desc,
                 coalesce(e.analyticsClicks, 0) desc,
                 coalesce(e.analyticsViews, 0) desc,
                 e.startDate asc
        """)
    List<Event> findTopRankedEvents(@Param("statuses") List<EventStatus> statuses, Pageable pageable);
}
