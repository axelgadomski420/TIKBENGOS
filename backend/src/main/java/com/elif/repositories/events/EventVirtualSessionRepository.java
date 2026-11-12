package com.elif.repositories.events;

import com.elif.entities.events.EventVirtualAttendance;
import com.elif.entities.events.EventVirtualSession;
import com.elif.entities.events.VirtualSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EventVirtualSessionRepository extends JpaRepository<EventVirtualSession, Long> {

    Optional<EventVirtualSession> findByEventId(Long eventId);
    Optional<EventVirtualSession> findByAccessToken(String accessToken);
    boolean existsByEventId(Long eventId);

    // ✅ Récupérer les sessions par statut
    List<EventVirtualSession> findByStatus(VirtualSessionStatus status);

    // ✅ Sessions à ouvrir
    @Query("""
        SELECT s FROM EventVirtualSession s
        WHERE s.status = :status
          AND s.event.startDate <= :openBefore
    """)
    List<EventVirtualSession> findSessionsToOpen(
            @Param("status") VirtualSessionStatus status,
            @Param("openBefore") LocalDateTime openBefore
    );

    // ✅ Sessions à fermer
    @Query("""
        SELECT s FROM EventVirtualSession s
        WHERE s.status = :status
          AND s.event.endDate < :closeBefore
    """)
    List<EventVirtualSession> findSessionsToClose(
            @Param("status") VirtualSessionStatus status,
            @Param("closeBefore") LocalDateTime closeBefore
    );
}