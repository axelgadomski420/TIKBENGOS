package com.elif.repositories.events;

import com.elif.entities.events.EventParticipant;
import com.elif.entities.events.ParticipantStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventParticipantRepository extends JpaRepository<EventParticipant, Long> {

    // ─── Vérifications ─────────────────────────────────────────────────────
    boolean existsByEventIdAndUserId(Long eventId, Long userId);

    boolean existsByEventIdAndUserIdAndStatus(Long eventId, Long userId, ParticipantStatus status);

    Optional<EventParticipant> findByEventIdAndUserId(Long eventId, Long userId);

    @Query("SELECT COUNT(p) > 0 FROM EventParticipant p " +
            "WHERE p.event.id = :eventId AND p.user.id = :userId " +
            "AND p.status IN :statuses")
    boolean existsActiveByEventIdAndUserId(@Param("eventId") Long eventId,
                                           @Param("userId") Long userId,
                                           @Param("statuses") List<ParticipantStatus> statuses);

    Optional<EventParticipant> findFirstByEventIdAndUserIdAndStatusInOrderByRegisteredAtDesc(
            Long eventId,
            Long userId,
            List<ParticipantStatus> statuses);

    // ─── Pagination ────────────────────────────────────────────────────────
    Page<EventParticipant> findByEventIdAndStatus(Long eventId, ParticipantStatus status, Pageable pageable);

    Page<EventParticipant> findByUserIdOrderByRegisteredAtDesc(Long userId, Pageable pageable);

    // ─── Listes ────────────────────────────────────────────────────────────
    List<EventParticipant> findByEventIdAndStatus(Long eventId, ParticipantStatus status);

    @Query("SELECT p FROM EventParticipant p WHERE p.event.id = :eventId " +
            "AND p.user.id = :userId AND p.status != 'CANCELLED'")
    List<EventParticipant> findAllByEventIdAndUserId(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId);

    // ✅ Trouver tous les participants confirmés
    @Query("SELECT p FROM EventParticipant p WHERE p.event.id = :eventId AND p.status = 'CONFIRMED'")
    List<EventParticipant> findConfirmedParticipants(@Param("eventId") Long eventId);

    // ─── Comptages ─────────────────────────────────────────────────────────
    long countByEventIdAndStatus(Long eventId, ParticipantStatus status);

    @Query("SELECT COALESCE(SUM(p.numberOfSeats), 0) FROM EventParticipant p " +
            "WHERE p.event.id = :eventId AND p.status = 'CONFIRMED'")
    Integer sumConfirmedSeatsByEventId(@Param("eventId") Long eventId);

    @Query("SELECT COALESCE(SUM(p.numberOfSeats), 0) FROM EventParticipant p WHERE p.status = 'CONFIRMED'")
    long countTotalConfirmedSeats();

    // ─── Mises à jour ──────────────────────────────────────────────────────
    @Modifying
    @Transactional
    @Query("UPDATE EventParticipant p SET p.status = :newStatus WHERE p.id = :participantId")
    int updateParticipantStatus(@Param("participantId") Long participantId,
                                @Param("newStatus") ParticipantStatus newStatus);

    @Modifying
    @Transactional
    @Query("UPDATE EventParticipant p SET p.status = 'CANCELLED' WHERE p.event.id = :eventId")
    int cancelAllParticipants(@Param("eventId") Long eventId);

    // ─── Suppressions ──────────────────────────────────────────────────────
    @Modifying
    @Transactional
    @Query("DELETE FROM EventParticipant p WHERE p.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);

    List<EventParticipant> findAllByEventIdAndStatus(Long eventId, ParticipantStatus status);
}
