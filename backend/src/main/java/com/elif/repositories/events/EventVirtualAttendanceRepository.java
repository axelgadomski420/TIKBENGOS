package com.elif.repositories.events;

import com.elif.entities.events.EventVirtualAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EventVirtualAttendanceRepository extends JpaRepository<EventVirtualAttendance, Long> {

    /** Toutes les présences d'une session */
    List<EventVirtualAttendance> findBySessionId(Long sessionId);

    /** Présence active (non sortie) d'un utilisateur dans une session */
    Optional<EventVirtualAttendance> findBySessionIdAndUserIdAndLeftAtIsNull(
            Long sessionId, Long userId
    );

    /** Présence consolidée (post-fermeture) d'un utilisateur */
    Optional<EventVirtualAttendance> findBySessionIdAndUserId(Long sessionId, Long userId);

    /** Participants encore connectés dans une session */
    List<EventVirtualAttendance> findBySessionIdAndLeftAtIsNull(Long sessionId);

    /** Présences ayant gagné un certificat dans une session */
    List<EventVirtualAttendance> findBySessionIdAndCertificateEarnedTrue(Long sessionId);

    /**
     * Durée totale de présence d'un utilisateur sur une session (somme des segments).
     */
    @Query("""
        SELECT COALESCE(SUM(a.totalSecondsPresent), 0)
        FROM EventVirtualAttendance a
        WHERE a.session.id = :sessionId
          AND a.user.id    = :userId
    """)
    long sumTotalSecondsBySessionAndUser(
            @Param("sessionId") Long sessionId,
            @Param("userId")    Long userId
    );

    /** Statistiques de présence pour le dashboard admin */
    @Query("""
        SELECT COUNT(DISTINCT a.user.id),
               AVG(a.attendancePercent),
               SUM(CASE WHEN a.certificateEarned = true THEN 1 ELSE 0 END)
        FROM EventVirtualAttendance a
        WHERE a.session.id = :sessionId
          AND a.attendancePercent IS NOT NULL
    """)
    Object[] getSessionStats(@Param("sessionId") Long sessionId);


    // EventVirtualAttendanceRepository.java
    Optional<EventVirtualAttendance> findBySessionEventIdAndUserIdAndCertificateToken(
            Long eventId, Long userId, String certificateToken);
    List<EventVirtualAttendance> findByUserId(Long userId);
    @Query("SELECT a FROM EventVirtualAttendance a " +
            "WHERE a.session.event.id = :eventId AND a.user.id = :userId")
    Optional<EventVirtualAttendance> findBySessionEventIdAndUserId(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId);
}
