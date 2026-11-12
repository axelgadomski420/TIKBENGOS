package com.elif.services.events.implementations;

import com.elif.dto.events.response.EventCapacityResponse;
import com.elif.entities.events.EventStatus;
import com.elif.exceptions.events.EventExceptions;
import com.elif.repositories.events.EventParticipantRepository;
import com.elif.repositories.events.EventRepository;
import com.elif.repositories.events.EventWaitlistRepository;
import com.elif.services.events.interfaces.IEventCapacityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ✅ SERVICE MÉTIER AVANCÉ : gestion de la capacité.
 *
 * Centralise toutes les opérations liées aux places :
 *  - Snapshot en temps réel (places restantes, liste d'attente, taux de remplissage)
 *  - Vérification de disponibilité avant inscription
 *  - Recalcul de cohérence (utile après un import ou migration)
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class EventCapacityService implements IEventCapacityService {

    private final EventRepository            eventRepository;
    private final EventParticipantRepository participantRepository;
    private final EventWaitlistRepository    waitlistRepository;

    /**
     * Retourne un snapshot complet de la capacité d'un événement.
     * Utilisé côté front pour afficher la jauge de remplissage.
     */
    @Override
    @Transactional(readOnly = true)
    public EventCapacityResponse getCapacitySnapshot(Long eventId) {
        var event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventExceptions.EventNotFoundException(eventId));

        int used      = event.getMaxParticipants() - event.getRemainingSlots();
        int waitlist  = (int) waitlistRepository.countByEventId(eventId);
        double fillPct = event.getMaxParticipants() > 0
                ? Math.round((used * 100.0 / event.getMaxParticipants()) * 10.0) / 10.0
                : 0.0;

        return EventCapacityResponse.builder()
                .eventId(eventId)
                .eventTitle(event.getTitle())
                .maxParticipants(event.getMaxParticipants())
                .remainingSlots(event.getRemainingSlots())
                .confirmedParticipants(used)
                .waitlistCount(waitlist)
                .fillRatePercent(fillPct)
                .isFull(event.getStatus() == EventStatus.FULL)
                .hasWaitlist(waitlist > 0)
                .build();
    }

    /**
     * Vérifie si un nombre de places demandées est disponible.
     * Lève InsufficientSlotsException si insuffisant.
     */
    @Override
    @Transactional(readOnly = true)
    public void assertSlotsAvailable(Long eventId, int requestedSeats) {
        var event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventExceptions.EventNotFoundException(eventId));

        if (event.getRemainingSlots() < requestedSeats) {
            throw new EventExceptions.InsufficientSlotsException(
                    event.getRemainingSlots(), requestedSeats);
        }
    }

    /**
     * Recalcule et corrige les remainingSlots d'un événement
     * en se basant sur les inscriptions CONFIRMED en base.
     *
     * Utile pour corriger une incohérence après un bug ou une migration.
     * Réservé à l'ADMIN.
     */
    @Override
    public EventCapacityResponse recalculateSlots(Long eventId) {
        var event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventExceptions.EventNotFoundException(eventId));

        Integer confirmedSeats = participantRepository.sumConfirmedSeatsByEventId(eventId);
        int usedSeats = confirmedSeats != null ? confirmedSeats : 0;
        int correctRemaining = Math.max(0, event.getMaxParticipants() - usedSeats);

        int before = event.getRemainingSlots();
        event.setRemainingSlots(correctRemaining);

        // Mettre à jour le statut FULL si nécessaire
        if (correctRemaining == 0 && event.getStatus() == EventStatus.PLANNED) {
            event.setStatus(EventStatus.FULL);
        } else if (correctRemaining > 0 && event.getStatus() == EventStatus.FULL) {
            event.setStatus(EventStatus.PLANNED);
        }

        eventRepository.save(event);
        log.info("🔧 Recalcul capacité event {} : {} → {} places restantes",
                eventId, before, correctRemaining);

        return getCapacitySnapshot(eventId);
    }
}
