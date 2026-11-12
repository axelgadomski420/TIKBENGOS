package com.elif.repositories.events;

import com.elif.entities.events.EventReminder;
import com.elif.entities.events.ReminderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventReminderRepository extends JpaRepository<EventReminder, Long> {

    /** Rappels dont l'heure d'envoi est passée (à traiter par le scheduler) */
    List<EventReminder> findByReminderTimeBefore(LocalDateTime now);

    /** Vérifie si un rappel de ce type existe déjà pour cet utilisateur + événement */
    boolean existsByEventIdAndUserIdAndType(Long eventId, Long userId, ReminderType type);

    /** Supprime les rappels d'un utilisateur sur un événement (désinscription) */
    @Modifying
    @Transactional
    void deleteByEventIdAndUserId(Long eventId, Long userId);

    /**
     * ✅ NOUVEAU : Supprime tous les rappels d'un événement.
     * Appelé quand l'événement est annulé ou supprimé.
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM EventReminder r WHERE r.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
