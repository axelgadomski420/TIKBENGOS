package com.elif.services.events.implementations;

import com.elif.dto.events.request.EventCreateRequest;
import com.elif.dto.events.request.EventUpdateRequest;
import com.elif.dto.events.response.EventCategoryResponse;
import com.elif.dto.events.response.EventDetailResponse;
import com.elif.dto.events.response.EventSummaryResponse;
import com.elif.entities.events.Event;
import com.elif.entities.events.EventCategory;
import com.elif.entities.events.EventParticipant;
import com.elif.entities.events.EventStatus;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.exceptions.events.EventExceptions;
import com.elif.repositories.events.EventCategoryRepository;
import com.elif.repositories.events.EventParticipantRepository;
import com.elif.repositories.events.EventRepository;
import com.elif.repositories.events.EventReviewRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.services.events.interfaces.IEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class EventServiceImpl implements IEventService {

    private final EventRepository            eventRepository;
    private final EventCategoryRepository    categoryRepository;
    private final EventReviewRepository      reviewRepository;
    private final EventParticipantRepository participantRepository;
    private final UserRepository             userRepository;
    private final ImageUploadService         imageUploadService;

    // ─── CREATE ──────────────────────────────────────────────────────

    @Override
    public EventDetailResponse createEvent(EventCreateRequest request, Long organizerId) {
        validateFutureDates(request.getStartDate(), request.getEndDate());

        EventCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new EventExceptions.CategoryNotFoundException(request.getCategoryId()));

        User organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException(
                        "User not found: " + organizerId));

        // ✅ Gérer l'upload de l'image
        String coverImageUrl = request.getCoverImageUrl();
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            coverImageUrl = imageUploadService.uploadEventImage(request.getImage());
        }

        boolean duplicate = eventRepository.existsDuplicate(
                request.getTitle(),
                request.getLocation(),
                request.getStartDate(),
                request.getEndDate(),
                EventStatus.CANCELLED,
                EventStatus.COMPLETED);
        if (duplicate) {
            log.warn("⚠️ Attempt to create duplicate event: '{}' at '{}'",
                    request.getTitle(), request.getLocation());
            throw new EventExceptions.DuplicateCategoryException(
                    "A similar event (same title, same location, overlapping dates) already exists.");
        }

        // ✅ AJOUT : isOnline inclus dans le builder
        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .maxParticipants(request.getMaxParticipants())
                .remainingSlots(request.getMaxParticipants())
                .coverImageUrl(coverImageUrl)
                .category(category)
                .createdBy(organizer)
                .status(EventStatus.PLANNED)
                .isOnline(Boolean.TRUE.equals(request.getIsOnline()))  // ✅ AJOUTÉ
                .build();

        Event saved = eventRepository.save(event);
        log.info("✅ Event created: '{}' (id={}) isOnline={} by userId={}",
                saved.getTitle(), saved.getId(), saved.getIsOnline(), organizerId);
        return toDetailResponse(saved, List.of());
    }

    // ─── READ ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public EventDetailResponse getEventById(Long eventId) {
        Event event = findEventOrThrow(eventId);
        List<EventSummaryResponse> suggestions = List.of();

        if (event.getStatus() == EventStatus.FULL && event.getCategory() != null) {
            List<Event> suggested = eventRepository.findSuggestedEvents(
                    event.getCategory().getId(),
                    event.getId(),
                    LocalDateTime.now(),
                    EventStatus.PLANNED,
                    PageRequest.of(0, 5)
            );
            suggestions = suggested.stream()
                    .map(this::toSummaryResponse)
                    .collect(Collectors.toList());
        }
        return toDetailResponse(event, suggestions);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventSummaryResponse> getAllEvents(EventStatus status, Long categoryId,
                                                   String keyword, Pageable pageable) {

        if (keyword != null && !keyword.isBlank()) {
            String likePattern = "%" + keyword.trim().toLowerCase() + "%";
            if (status != null) {
                return eventRepository.searchByKeyword(likePattern, status, pageable)
                        .map(this::toSummaryResponse);
            } else {
                return eventRepository.searchByKeywordAllStatus(likePattern, pageable)
                        .map(this::toSummaryResponse);
            }
        }
        if (categoryId != null) {
            if (status != null) {
                return eventRepository.findByCategoryIdAndStatus(categoryId, status, pageable)
                        .map(this::toSummaryResponse);
            } else {
                return eventRepository.findByCategoryId(categoryId, pageable)
                        .map(this::toSummaryResponse);
            }
        }
        if (status != null) {
            return eventRepository.findByStatus(status, pageable)
                    .map(this::toSummaryResponse);
        } else {
            return eventRepository.findAll(pageable)
                    .map(this::toSummaryResponse);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventSummaryResponse> getMyOrganizedEvents(Long organizerId, Pageable pageable) {
        return eventRepository.findByCreatedByIdOrderByStartDateDesc(organizerId, pageable)
                .map(this::toSummaryResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, List<EventSummaryResponse>> getCalendarEvents(int year, int month) {
        if (month < 1 || month > 12) {
            throw new EventExceptions.InvalidDateRangeException("Month must be between 1 and 12.");
        }
        LocalDateTime start = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime end   = start.plusMonths(1).minusSeconds(1);
        List<Event> events  = eventRepository.findByStartDateBetween(start, end);

        return events.stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.groupingBy(e -> e.getStartDate().toLocalDate().toString()));
    }

    // ─── UPDATE ───────────────────────────────────────────────────────

    @Override
    public EventDetailResponse updateEvent(Long eventId, EventUpdateRequest request, Long userId) {
        Event event = findEventOrThrow(eventId);
        assertCanEdit(event, userId);
        assertIsEditable(event);

        String oldImageUrl = event.getCoverImageUrl();

        if (request.getTitle() != null) event.setTitle(request.getTitle());
        if (request.getDescription() != null) event.setDescription(request.getDescription());
        if (request.getLocation() != null) event.setLocation(request.getLocation());

        // ✅ Gérer l'upload de nouvelle image
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            if (oldImageUrl != null) {
                imageUploadService.deleteEventImage(oldImageUrl);
            }
            String newImageUrl = imageUploadService.uploadEventImage(request.getImage());
            event.setCoverImageUrl(newImageUrl);
        } else if (request.getCoverImageUrl() != null) {
            event.setCoverImageUrl(request.getCoverImageUrl());
        }

        LocalDateTime newStart = request.getStartDate() != null ? request.getStartDate() : event.getStartDate();
        LocalDateTime newEnd   = request.getEndDate()   != null ? request.getEndDate()   : event.getEndDate();
        validateDateRange(newStart, newEnd);
        event.setStartDate(newStart);
        event.setEndDate(newEnd);

        if (request.getMaxParticipants() != null) {
            int usedSlots = event.getMaxParticipants() - event.getRemainingSlots();
            if (request.getMaxParticipants() < usedSlots) {
                throw new EventExceptions.CapacityReductionException(request.getMaxParticipants(), usedSlots);
            }
            event.setMaxParticipants(request.getMaxParticipants());
            event.setRemainingSlots(request.getMaxParticipants() - usedSlots);
        }

        if (request.getCategoryId() != null) {
            EventCategory category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new EventExceptions.CategoryNotFoundException(request.getCategoryId()));
            event.setCategory(category);
        }

        // ✅ AJOUT : Mise à jour de isOnline
        if (request.getIsOnline() != null) {
            event.setIsOnline(Boolean.TRUE.equals(request.getIsOnline()));  // ✅ AJOUTÉ
        }

        Event saved = eventRepository.save(event);
        log.info("✏️ Event {} updated by userId={}, isOnline={}", eventId, userId, saved.getIsOnline());
        return toDetailResponse(saved, List.of());
    }

    @Override
    public EventDetailResponse updateEventStatus(Long eventId, EventStatus newStatus, Long userId) {
        Event event = findEventOrThrow(eventId);
        assertCanEdit(event, userId);

        if (newStatus != EventStatus.CANCELLED) {
            throw new EventExceptions.EventNotEditableException(
                    "Only manual cancellation is allowed via this endpoint.");
        }
        if (event.getStatus() == EventStatus.COMPLETED) {
            throw new EventExceptions.EventNotEditableException("completed");
        }
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new EventExceptions.EventNotEditableException("already cancelled");
        }

        event.setStatus(EventStatus.CANCELLED);
        log.info("🚫 Event {} cancelled by userId={}", eventId, userId);
        return toDetailResponse(eventRepository.save(event), List.of());
    }

    // ─── DELETE ───────────────────────────────────────────────────────

    @Override
    public void deleteEvent(Long eventId, Long userId) {
        Event event = findEventOrThrow(eventId);
        assertCanEdit(event, userId);

        if (event.getStatus() == EventStatus.COMPLETED) {
            throw new EventExceptions.EventNotEditableException("completed");
        }
        if (event.getStatus() == EventStatus.ONGOING) {
            throw new EventExceptions.EventNotEditableException(
                    "ongoing — cancel it first before deleting.");
        }

        // ✅ Supprimer l'image associée
        if (event.getCoverImageUrl() != null) {
            imageUploadService.deleteEventImage(event.getCoverImageUrl());
        }

        eventRepository.delete(event);
        log.info("🗑️ Event {} deleted by userId={}", eventId, userId);
    }
    @Override
    public EventParticipant findParticipantById(Long id) {
        return participantRepository.findById(id).orElse(null);
    }
    // ─── SCHEDULER ───────────────────────────────────────────────────

    @Scheduled(cron = "0 */5 * * * *")
    @Override
    public void markCompletedEvents() {
        LocalDateTime now = LocalDateTime.now();
        log.info("🔄 Checking events to update at {}", now);

        List<Event> toOngoing = eventRepository.findEventsToMarkOngoing(
                now, List.of(EventStatus.PLANNED, EventStatus.FULL));

        if (!toOngoing.isEmpty()) {
            for (Event e : toOngoing) {
                log.info("   ▶️ {} (startDate: {}) → ONGOING", e.getTitle(), e.getStartDate());
                e.setStatus(EventStatus.ONGOING);
            }
            eventRepository.saveAll(toOngoing);
            log.info("▶️ {} event(s) moved to ONGOING", toOngoing.size());
        }

        List<Event> toComplete = eventRepository.findOngoingEventsToComplete(now);

        if (!toComplete.isEmpty()) {
            for (Event e : toComplete) {
                log.info("   ✅ {} (endDate: {}) → COMPLETED", e.getTitle(), e.getEndDate());
                e.setStatus(EventStatus.COMPLETED);
            }
            eventRepository.saveAll(toComplete);
            log.info("✅ {} event(s) moved to COMPLETED", toComplete.size());
        } else {
            log.info("📋 No events to mark as COMPLETED");
        }
    }

    // ─── Helpers privés ──────────────────────────────────────────────

    private void validateFutureDates(LocalDateTime startDate, LocalDateTime endDate) {
        LocalDateTime now = LocalDateTime.now();
        if (startDate.isBefore(now))
            throw new EventExceptions.InvalidDateRangeException("Start date must be in the future.");
        validateDateRange(startDate, endDate);
    }

    private void validateDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        if (!endDate.isAfter(startDate))
            throw new EventExceptions.InvalidDateRangeException(
                    "End date must be after start date.");
    }

    private void assertCanEdit(Event event, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException(
                        "User not found: " + userId));
        boolean isAdmin = user.getRole() == Role.ADMIN;
        boolean isOrganizer = event.getCreatedBy().getId().equals(userId);
        if (!isAdmin && !isOrganizer) {
            throw new EventExceptions.AccessDeniedException(
                    "You are not authorized to modify this event.");
        }
    }

    private void assertIsEditable(Event event) {
        if (event.getStatus() == EventStatus.COMPLETED || event.getStatus() == EventStatus.CANCELLED) {
            throw new EventExceptions.EventNotEditableException(
                    event.getStatus().name().toLowerCase());
        }
    }

    public Event findEventOrThrow(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new EventExceptions.EventNotFoundException(id));
    }

    // ✅ AJOUT : isOnline dans toSummaryResponse
    EventSummaryResponse toSummaryResponse(Event event) {
        Double avgRating = reviewRepository.findAverageRatingByEventId(event.getId());
        long   reviews   = reviewRepository.countByEventId(event.getId());
        return EventSummaryResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .location(event.getLocation())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .maxParticipants(event.getMaxParticipants())
                .remainingSlots(event.getRemainingSlots())
                .coverImageUrl(event.getCoverImageUrl())
                .status(event.getStatus())
                .category(toCategoryResponse(event.getCategory()))
                .organizerName(event.getCreatedBy() != null
                        ? event.getCreatedBy().getFirstName() + " " + event.getCreatedBy().getLastName()
                        : null)
                .averageRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0)
                .reviewCount((int) reviews)
                .isOnline(Boolean.TRUE.equals(event.getIsOnline()))  // ✅ AJOUTÉ
                .build();
    }

    // ✅ AJOUT : isOnline dans toDetailResponse
    private EventDetailResponse toDetailResponse(Event event, List<EventSummaryResponse> suggestions) {
        Double avgRating = reviewRepository.findAverageRatingByEventId(event.getId());
        long   reviews   = reviewRepository.countByEventId(event.getId());
        return EventDetailResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .location(event.getLocation())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .maxParticipants(event.getMaxParticipants())
                .remainingSlots(event.getRemainingSlots())
                .coverImageUrl(event.getCoverImageUrl())
                .status(event.getStatus())
                .category(toCategoryResponse(event.getCategory()))
                .organizerName(event.getCreatedBy() != null
                        ? event.getCreatedBy().getFirstName() + " " + event.getCreatedBy().getLastName()
                        : null)
                .organizerId(event.getCreatedBy() != null ? event.getCreatedBy().getId() : null)
                .createdAt(event.getCreatedAt())
                .averageRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0)
                .reviewCount((int) reviews)
                .suggestedEvents(suggestions)
                .isOnline(Boolean.TRUE.equals(event.getIsOnline()))  // ✅ AJOUTÉ
                .build();
    }

    private EventCategoryResponse toCategoryResponse(EventCategory c) {
        if (c == null) return null;
        return EventCategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .icon(c.getIcon())
                .description(c.getDescription())
                .requiresApproval(c.getRequiresApproval())
                .competitionMode(c.getCompetitionMode())
                .build();
    }
}
