package com.elif.repositories.events;

import com.elif.entities.events.Event;
import com.elif.entities.events.EventInteraction;
import com.elif.entities.events.InteractionType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventInteractionRepository extends JpaRepository<EventInteraction, Long> {

    boolean existsByEventIdAndSessionIdAndTypeAndCreatedAtAfter(Long eventId,
                                                                String sessionId,
                                                                InteractionType type,
                                                                LocalDateTime after);

    long countByEventIdAndType(Long eventId, InteractionType type);

    long countByEventId(Long eventId);

    long countByCreatedAtAfter(LocalDateTime since);

    @Query("""
        select i.event.id,
               sum(case
                   when i.type = com.elif.entities.events.InteractionType.VIEW then 1
                   when i.type = com.elif.entities.events.InteractionType.SEARCH_CLICK then 3
                   when i.type = com.elif.entities.events.InteractionType.DETAIL_OPEN then 5
                   when i.type = com.elif.entities.events.InteractionType.WAITLIST_JOIN then 10
                   when i.type = com.elif.entities.events.InteractionType.REVIEW_POSTED then 15
                   when i.type = com.elif.entities.events.InteractionType.REGISTRATION then 20
                   else 0
               end)
        from EventInteraction i
        where i.createdAt >= :since
        group by i.event.id
        order by 2 desc
        """)
    List<Object[]> findPopularityScoresSince(@Param("since") LocalDateTime since);

    @Query("""
        select count(distinct coalesce(i.sessionId, concat('user:', cast(i.user.id as string)), concat('interaction:', cast(i.id as string))))
        from EventInteraction i
        where i.event.id = :eventId
          and i.type = com.elif.entities.events.InteractionType.VIEW
          and i.createdAt >= :since
        """)
    long countUniqueViewsSince(@Param("eventId") Long eventId, @Param("since") LocalDateTime since);

    @Query("""
        select
            sum(case when i.type = com.elif.entities.events.InteractionType.VIEW then 1 else 0 end),
            sum(case when i.type = com.elif.entities.events.InteractionType.REGISTRATION then 1 else 0 end)
        from EventInteraction i
        where i.event.id = :eventId
        """)
    Object[] findConversionData(@Param("eventId") Long eventId);

    @Query("""
        select e from Event e
        where e.status = 'PLANNED'
          and e.startDate > :now
          and coalesce(e.analyticsViews, 0) < :threshold
        order by coalesce(e.analyticsViews, 0) asc, e.startDate asc
        """)
    List<Event> findNeglectedEvents(@Param("now") LocalDateTime now,
                                    @Param("threshold") long threshold,
                                    Pageable pageable);

    @Query("""
        select i.type, count(i)
        from EventInteraction i
        where i.createdAt >= :since
        group by i.type
        """)
    List<Object[]> countByTypeSince(@Param("since") LocalDateTime since);

    @Query("""
        select count(i)
        from EventInteraction i
        where i.event.id = :eventId
          and i.type = :type
          and i.createdAt between :from and :to
        """)
    long countByEventIdAndTypeAndCreatedAtBetween(@Param("eventId") Long eventId,
                                                  @Param("type") InteractionType type,
                                                  @Param("from") LocalDateTime from,
                                                  @Param("to") LocalDateTime to);

    @Query("""
        select count(i)
        from EventInteraction i
        where i.event.id = :eventId
          and i.createdAt >= :since
        """)
    long countByEventIdAndCreatedAtAfter(@Param("eventId") Long eventId, @Param("since") LocalDateTime since);

    @Modifying
    @Transactional
    @Query("delete from EventInteraction i where i.createdAt < :before")
    int deleteOlderThan(@Param("before") LocalDateTime before);
}
