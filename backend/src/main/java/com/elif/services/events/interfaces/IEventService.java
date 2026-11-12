package com.elif.services.events.interfaces;

import com.elif.dto.events.request.EventCreateRequest;
import com.elif.dto.events.request.EventUpdateRequest;
import com.elif.dto.events.response.EventDetailResponse;
import com.elif.dto.events.response.EventSummaryResponse;
import com.elif.entities.events.Event;  // ✅ AJOUTER CET IMPORT
import com.elif.entities.events.EventParticipant;
import com.elif.entities.events.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface IEventService {

    EventDetailResponse createEvent(EventCreateRequest request, Long organizerId);

    EventDetailResponse getEventById(Long eventId);

    Page<EventSummaryResponse> getAllEvents(EventStatus status, Long categoryId,
                                            String keyword, Pageable pageable);

    EventDetailResponse updateEvent(Long eventId, EventUpdateRequest request, Long userId);

    EventDetailResponse updateEventStatus(Long eventId, EventStatus newStatus, Long userId);

    void deleteEvent(Long eventId, Long userId);

    Page<EventSummaryResponse> getMyOrganizedEvents(Long organizerId, Pageable pageable);

    void markCompletedEvents();

    Event findEventOrThrow(Long id);

    Map<String, List<EventSummaryResponse>> getCalendarEvents(int year, int month);
    // Dans IEventWaitlistService
    EventParticipant findParticipantById(Long id);
}