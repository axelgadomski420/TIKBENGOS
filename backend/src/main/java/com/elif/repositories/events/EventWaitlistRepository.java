package com.elif.repositories.events;

import com.elif.entities.events.EventWaitlist;
import com.elif.entities.events.WaitlistStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventWaitlistRepository extends JpaRepository<EventWaitlist, Long> {

    boolean existsByEventIdAndUserId(Long eventId, Long userId);

    Optional<EventWaitlist> findByEventIdAndUserId(Long eventId, Long userId);

    Optional<EventWaitlist> findFirstByEventIdAndUserIdAndStatusInOrderByJoinedAtDesc(
            Long eventId,
            Long userId,
            List<WaitlistStatus> statuses);

    List<EventWaitlist> findByEventIdOrderByPositionAsc(Long eventId);

    Page<EventWaitlist> findByEventIdOrderByPositionAsc(Long eventId, Pageable pageable);

    Page<EventWaitlist> findByUserIdOrderByJoinedAtDesc(Long userId, Pageable pageable);

    @Query("SELECT COALESCE(MAX(w.position), 0) FROM EventWaitlist w WHERE w.event.id = :eventId")
    int findMaxPositionByEventId(@Param("eventId") Long eventId);

    @Query("SELECT COUNT(w) FROM EventWaitlist w WHERE w.event.id = :eventId AND w.position < :position")
    long countAhead(@Param("eventId") Long eventId, @Param("position") int position);

    long countByEventId(Long eventId);

    Optional<EventWaitlist> findFirstByEventIdOrderByPositionAsc(Long eventId);

    @Modifying
    @Query("DELETE FROM EventWaitlist w WHERE w.event.id = :eventId")
    void deleteAllByEventId(@Param("eventId") Long eventId);

    @Query("SELECT COUNT(w) > 0 FROM EventWaitlist w " +
            "WHERE w.event.id = :eventId AND w.user.id = :userId " +
            "AND w.status IN :statuses")
    boolean existsActiveByEventIdAndUserId(@Param("eventId") Long eventId,
                                           @Param("userId") Long userId,
                                           @Param("statuses") List<WaitlistStatus> statuses);

    Optional<EventWaitlist> findByEventIdAndUserIdAndStatus(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId,
            @Param("status") WaitlistStatus status);

    @Query("SELECT w FROM EventWaitlist w " +
            "WHERE w.status = :status " +
            "AND w.confirmationDeadline IS NOT NULL " +
            "AND w.confirmationDeadline < :now")
    List<EventWaitlist> findExpiredNotifiedEntries(@Param("now") LocalDateTime now,
                                                   @Param("status") WaitlistStatus status);

    List<EventWaitlist> findByEventIdAndStatusOrderByPositionAsc(
            @Param("eventId") Long eventId,
            @Param("status") WaitlistStatus status);

    Page<EventWaitlist> findByEventIdAndStatusOrderByPositionAsc(
            @Param("eventId") Long eventId,
            @Param("status") WaitlistStatus status,
            Pageable pageable);

    @Query("SELECT w FROM EventWaitlist w " +
            "WHERE w.user.id = :userId " +
            "AND w.status IN :statuses " +
            "ORDER BY w.joinedAt DESC")
    Page<EventWaitlist> findActiveByUserId(@Param("userId") Long userId,
                                           @Param("statuses") List<WaitlistStatus> statuses,
                                           Pageable pageable);  // ✅ Correction de la virgule

    @Modifying
    @Query("UPDATE EventWaitlist w SET w.position = w.position - 1 " +
            "WHERE w.event.id = :eventId " +
            "AND w.status = :status " +
            "AND w.position > :position")
    void decrementPositionsAfter(@Param("eventId") Long eventId,
                                 @Param("position") int position,
                                 @Param("status") WaitlistStatus status);

    long countByEventIdAndStatus(@Param("eventId") Long eventId,
                                 @Param("status") WaitlistStatus status);
    @Query("SELECT w FROM EventWaitlist w " +
            "WHERE w.event.id = :eventId AND w.status = :status " +
            "ORDER BY w.position ASC")
    List<EventWaitlist> findFirstWaiting(@Param("eventId") Long eventId,
                                         @Param("status") WaitlistStatus status,
                                         Pageable pageable);

    @Modifying
    @Query("DELETE FROM EventWaitlist w WHERE w.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
