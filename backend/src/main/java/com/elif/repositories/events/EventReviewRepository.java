package com.elif.repositories.events;

import com.elif.entities.events.EventReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EventReviewRepository extends JpaRepository<EventReview, Long> {

    // Vérifier si un user a déjà laissé un avis pour un événement
    boolean existsByEventIdAndUserId(Long eventId, Long userId);

    // Récupérer l'avis d'un user pour un événement
    Optional<EventReview> findByEventIdAndUserId(Long eventId, Long userId);

    // Tous les avis d'un événement
    Page<EventReview> findByEventIdOrderByCreatedAtDesc(Long eventId, Pageable pageable);

    // Note moyenne d'un événement
    @Query("SELECT AVG(r.rating) FROM EventReview r WHERE r.event.id = :eventId")
    Double findAverageRatingByEventId(@Param("eventId") Long eventId);

    // Nombre d'avis d'un événement
    long countByEventId(Long eventId);

    // Note moyenne globale d'un organisateur
    @Query("SELECT AVG(r.rating) FROM EventReview r WHERE r.event.createdBy.id = :organizerId")
    Double findAverageRatingByOrganizerId(@Param("organizerId") Long organizerId);
    @Modifying
    @Query("DELETE FROM EventReview r WHERE r.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
