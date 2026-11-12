package com.elif.services.events.interfaces;

import com.elif.dto.events.request.EventParticipantRequest;
import com.elif.dto.events.response.EventParticipantResponse;
import com.elif.entities.events.ParticipantStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface IEventParticipantService {

    EventParticipantResponse registerToEvent(Long eventId, Long userId, EventParticipantRequest request);
    void cancelRegistration(Long eventId, Long userId);
    Page<EventParticipantResponse> getEventParticipants(Long eventId, Long requesterId, Pageable pageable);
    Page<EventParticipantResponse> getMyRegistrations(Long userId, Pageable pageable);
    boolean isUserRegistered(Long eventId, Long userId);

    // ✅ NOUVELLES méthodes admin pour les compétitions
    /** Approuver une inscription PENDING → CONFIRMED */
    EventParticipantResponse approveParticipant(Long participantId, Long adminId);

    /** Rejeter une inscription PENDING → CANCELLED */
    EventParticipantResponse rejectParticipant(Long participantId, Long adminId);

    /** Lister les inscriptions en attente d'un événement */
    Page<EventParticipantResponse> getPendingParticipants(Long eventId, Long adminId, Pageable pageable);

}

