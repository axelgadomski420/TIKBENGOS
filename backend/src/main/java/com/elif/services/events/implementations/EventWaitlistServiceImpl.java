package com.elif.services.events.implementations;

import com.elif.dto.events.request.EventParticipantRequest;
import com.elif.dto.events.response.WaitlistResponse;
import com.elif.entities.events.*;
import com.elif.entities.notification.enums.NotificationType;
import com.elif.entities.user.User;
import com.elif.exceptions.events.EventExceptions;
import com.elif.repositories.events.EventParticipantRepository;
import com.elif.repositories.events.EventRepository;
import com.elif.repositories.events.EventWaitlistRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.services.events.interfaces.IEventReminderService;
import com.elif.services.events.interfaces.IEventWaitlistService;
import com.elif.services.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EventWaitlistServiceImpl implements IEventWaitlistService {

    private static final int DEFAULT_DEADLINE_HOURS = 24;
    private static final List<WaitlistStatus> ACTIVE_WAITLIST_STATUSES = Arrays.asList(
            WaitlistStatus.WAITING,
            WaitlistStatus.NOTIFIED
    );

    private final EventWaitlistRepository waitlistRepository;
    private final EventRepository eventRepository;
    private final EventParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final IEventReminderService reminderService;
    private final AppNotificationService notificationService;
    private final EventEmailService emailService;

    @Override
    public WaitlistResponse joinWaitlist(Long eventId, Long userId, EventParticipantRequest request) {
        Event event = findEventOrThrow(eventId);

        if (event.getStatus() != EventStatus.FULL) {
            throw new EventExceptions.WaitlistNotOpenException();
        }

        if (waitlistRepository.existsActiveByEventIdAndUserId(eventId, userId, ACTIVE_WAITLIST_STATUSES)) {
            throw new EventExceptions.AlreadyOnWaitlistException();
        }

        if (participantRepository.existsActiveByEventIdAndUserId(
                eventId,
                userId,
                Arrays.asList(ParticipantStatus.CONFIRMED, ParticipantStatus.PENDING))) {
            throw new EventExceptions.DuplicateRegistrationException(userId, eventId);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException(
                        "User not found: " + userId));

        long waitingCount = waitlistRepository.countByEventIdAndStatus(eventId, WaitlistStatus.WAITING);
        int nextPosition = (int) waitingCount + 1;

        EventWaitlist entry = waitlistRepository
                .findFirstByEventIdAndUserIdAndStatusInOrderByJoinedAtDesc(
                        eventId,
                        userId,
                        Arrays.asList(WaitlistStatus.CANCELLED, WaitlistStatus.EXPIRED)
                )
                .orElseGet(EventWaitlist::new);

        entry.setEvent(event);
        entry.setUser(user);
        entry.setNumberOfSeats(request.getNumberOfSeats());
        entry.setPosition(nextPosition);
        entry.setStatus(WaitlistStatus.WAITING);
        entry.setNotified(false);
        entry.setNotifiedAt(null);
        entry.setConfirmationDeadline(null);
        entry.setConfirmedParticipant(null);

        EventWaitlist saved = waitlistRepository.save(entry);
        log.info("User {} added to waitlist at position {} for event '{}'",
                user.getEmail(), nextPosition, event.getTitle());

        return toResponse(saved);
    }

    @Override
    public void leaveWaitlist(Long eventId, Long userId) {
        EventWaitlist entry = waitlistRepository
                .findFirstByEventIdAndUserIdAndStatusInOrderByJoinedAtDesc(
                        eventId,
                        userId,
                        ACTIVE_WAITLIST_STATUSES
                )
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException(
                        "You are not on the waitlist for this event."));

        int removedPosition = entry.getPosition();
        entry.cancel();
        waitlistRepository.save(entry);

        List<EventWaitlist> remainingEntries = waitlistRepository.findByEventIdAndStatusOrderByPositionAsc(eventId, WaitlistStatus.WAITING);
        for (EventWaitlist e : remainingEntries) {
            if (e.getPosition() > removedPosition) {
                e.setPosition(e.getPosition() - 1);
                waitlistRepository.save(e);
            }
        }

        log.info("User {} removed from waitlist for event {}", userId, eventId);
    }

    @Override
    @Transactional(readOnly = true)
    public WaitlistResponse getMyWaitlistEntry(Long eventId, Long userId) {
        EventWaitlist entry = waitlistRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException(
                        "You are not on the waitlist for this event."));
        return toResponse(entry);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WaitlistResponse> getWaitlist(Long eventId, Long adminId, Pageable pageable) {
        findEventOrThrow(eventId);
        return waitlistRepository.findByEventIdAndStatusOrderByPositionAsc(eventId, WaitlistStatus.WAITING, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WaitlistResponse> getMyWaitlistEntries(Long userId, Pageable pageable) {
        Page<EventWaitlist> entries = waitlistRepository.findByUserIdOrderByJoinedAtDesc(userId, pageable);
        return entries.map(this::toResponse);
    }

    @Override
    public WaitlistResponse notifyWaitlistEntry(Long waitlistEntryId, Long adminId, int deadlineHours) {
        EventWaitlist entry = waitlistRepository.findById(waitlistEntryId)
                .orElseThrow(() -> new IllegalArgumentException("Waitlist entry not found: " + waitlistEntryId));

        if (entry.getStatus() != WaitlistStatus.WAITING) {
            throw new IllegalStateException("Only WAITING entries can be notified. Current status: " + entry.getStatus());
        }

        int effectiveDeadline = (deadlineHours > 0 && deadlineHours <= 72) ? deadlineHours : DEFAULT_DEADLINE_HOURS;

        entry.notifyWithDeadline(effectiveDeadline);
        waitlistRepository.save(entry);

        notificationService.create(
                entry.getUser().getId(),
                adminId,
                NotificationType.WAITLIST_OFFER,
                "A spot is available!",
                String.format(
                        "A spot has opened up for %s. You have %d hour(s) to confirm your registration.",
                        entry.getEvent().getTitle(), effectiveDeadline
                ),
                "/events/" + entry.getEvent().getId() + "/waitlist/confirm",
                "WAITLIST_ENTRY",
                entry.getId()
        );

        emailService.sendWaitlistOffer(
                entry.getUser().getEmail(),
                entry.getUser().getFirstName(),
                entry.getEvent().getTitle(),
                entry.getEvent().getId(),
                entry.getId(),
                effectiveDeadline
        );

        log.info("Admin {} notified user {} (entry {}) with {}h deadline",
                adminId, entry.getUser().getId(), waitlistEntryId, effectiveDeadline);

        return toResponse(entry);
    }

    @Override
    public WaitlistResponse confirmWaitlistEntry(Long eventId, Long userId) {
        EventWaitlist entry = waitlistRepository
                .findByEventIdAndUserIdAndStatus(eventId, userId, WaitlistStatus.NOTIFIED)
                .orElseThrow(() -> new IllegalStateException(
                        "No pending offer found for this event."));

        if (entry.isDeadlineExpired()) {
            entry.expire();
            waitlistRepository.save(entry);

            List<EventWaitlist> remainingEntries = waitlistRepository.findByEventIdAndStatusOrderByPositionAsc(eventId, WaitlistStatus.WAITING);
            for (EventWaitlist e : remainingEntries) {
                if (e.getPosition() > entry.getPosition()) {
                    e.setPosition(e.getPosition() - 1);
                    waitlistRepository.save(e);
                }
            }

            promoteFirstWaitingWithDeadline(eventId);
            throw new IllegalStateException("Confirmation deadline has expired (24h).");
        }

        Event event = entry.getEvent();

        if (event.getRemainingSlots() < entry.getNumberOfSeats()) {
            throw new IllegalStateException("Seats are no longer available for this event.");
        }

        EventParticipant participant = participantRepository
                .findFirstByEventIdAndUserIdAndStatusInOrderByRegisteredAtDesc(
                        eventId,
                        userId,
                        Arrays.asList(ParticipantStatus.CANCELLED)
                )
                .orElseGet(EventParticipant::new);

        participant.setEvent(event);
        participant.setUser(entry.getUser());
        participant.setNumberOfSeats(entry.getNumberOfSeats());
        participant.setStatus(ParticipantStatus.CONFIRMED);
        participant.setRegisteredAt(LocalDateTime.now());
        participant.setEligibilityScore(null);

        EventParticipant savedParticipant = participantRepository.save(participant);

        event.decrementSlots(entry.getNumberOfSeats());
        if (event.getRemainingSlots() == 0) {
            event.setStatus(EventStatus.FULL);
        }
        eventRepository.save(event);

        entry.confirm(savedParticipant);
        waitlistRepository.save(entry);

        reminderService.scheduleReminders(event, entry.getUser());

        notificationService.create(
                userId,
                null,
                NotificationType.REGISTRATION_CONFIRMED,
                "Registration confirmed!",
                String.format("Your registration for %s has been confirmed. See you soon!", event.getTitle()),
                "/events/" + eventId,
                "EVENT",
                eventId
        );

        notificationService.create(
                event.getCreatedBy().getId(),
                userId,
                NotificationType.WAITLIST_CONFIRMED_BY_USER,
                "User confirmed their spot",
                String.format("%s %s confirmed their spot for %s via waitlist.",
                        entry.getUser().getFirstName(), entry.getUser().getLastName(), event.getTitle()),
                "/events/" + eventId + "/participants",
                "EVENT",
                eventId
        );

        emailService.sendRegistrationConfirmed(
                entry.getUser().getEmail(),
                entry.getUser().getFirstName(),
                event.getTitle(),
                eventId,
                event.getLocation(),
                event.getStartDate()
        );

        log.info("User {} confirmed their waitlist spot for event {}", userId, eventId);

        return toResponse(entry);
    }

    @Override
    public void expireOverdueNotifications() {
        List<EventWaitlist> overdue = waitlistRepository.findExpiredNotifiedEntries(LocalDateTime.now(), WaitlistStatus.NOTIFIED);

        if (overdue.isEmpty()) return;

        for (EventWaitlist entry : overdue) {
            Long eventId = entry.getEvent().getId();

            entry.expire();
            waitlistRepository.save(entry);

            List<EventWaitlist> remainingEntries = waitlistRepository.findByEventIdAndStatusOrderByPositionAsc(eventId, WaitlistStatus.WAITING);
            for (EventWaitlist e : remainingEntries) {
                if (e.getPosition() > entry.getPosition()) {
                    e.setPosition(e.getPosition() - 1);
                    waitlistRepository.save(e);
                }
            }

            notificationService.create(
                    entry.getUser().getId(),
                    null,
                    NotificationType.WAITLIST_EXPIRED,
                    "Confirmation deadline expired",
                    String.format(
                            "You did not confirm your spot for %s within 24h.",
                            entry.getEvent().getTitle()
                    ),
                    "/events/" + eventId,
                    "EVENT",
                    eventId
            );

            emailService.sendWaitlistExpired(
                    entry.getUser().getEmail(),
                    entry.getUser().getFirstName(),
                    entry.getEvent().getTitle()
            );

            log.warn("Waitlist entry {} expired (userId={}, eventId={})",
                    entry.getId(), entry.getUser().getId(), eventId);

            promoteFirstWaitingWithDeadline(eventId);
        }

        log.info("Waitlist scheduler: {} expired entry(ies) processed", overdue.size());
    }

    // ═══════════════════════════════════════════════════════════════════
    // ✅ PROMOTE NEXT - VERSION CORRIGÉE
    // ═══════════════════════════════════════════════════════════════════
    @Override
    public boolean promoteNext(Long eventId) {
        Event event = findEventOrThrow(eventId);
        if (event.getRemainingSlots() <= 0) return false;

        // ✅ BUG FIX : filtrer uniquement sur WAITING (pas NOTIFIED/EXPIRED/CANCELLED)
        // Au lieu de findFirstByEventIdOrderByPositionAsc() qui retourne n'importe quel statut
        List<EventWaitlist> firstWaiting = waitlistRepository
                .findFirstWaiting(eventId, WaitlistStatus.WAITING, PageRequest.of(0, 1));

        if (firstWaiting.isEmpty()) {
            log.debug("No WAITING users for event {}", eventId);
            return false;
        }

        EventWaitlist first = firstWaiting.get(0);

        if (event.getRemainingSlots() < first.getNumberOfSeats()) {
            log.warn("Not enough slots for waitlist entry {} (needs {}, has {})",
                    first.getId(), first.getNumberOfSeats(), event.getRemainingSlots());
            return false;
        }

        // ✅ FIX : utilise promoteFirstWaitingWithDeadline (qui envoie la notification)
        // au lieu de créer un participant directement sans notifier l'utilisateur
        promoteFirstWaitingWithDeadline(eventId);

        log.info("✅ promoteNext: notified user {} for event '{}'",
                first.getUser().getEmail(), event.getTitle());
        return true;
    }

    @Override
    public void promoteFirstWaitingWithDeadline(Long eventId) {
        Event event = eventRepository.findById(eventId).orElse(null);
        if (event == null || event.getRemainingSlots() <= 0) return;

        List<EventWaitlist> firstInLine = waitlistRepository.findFirstWaiting(eventId, WaitlistStatus.WAITING, PageRequest.of(0, 1));

        if (firstInLine.isEmpty()) {
            log.debug("No users waiting for event {}", eventId);
            return;
        }

        EventWaitlist next = firstInLine.get(0);

        next.notifyWithDeadline(DEFAULT_DEADLINE_HOURS);
        waitlistRepository.save(next);

        notificationService.create(
                next.getUser().getId(),
                null,
                NotificationType.WAITLIST_OFFER,
                "A spot is available for you!",
                String.format(
                        "Good news! A spot has opened up for %s. You have %d hour(s) to confirm your registration.",
                        event.getTitle(), DEFAULT_DEADLINE_HOURS
                ),
                "/events/" + eventId + "/waitlist/confirm",
                "WAITLIST_ENTRY",
                next.getId()
        );

        emailService.sendWaitlistOffer(
                next.getUser().getEmail(),
                next.getUser().getFirstName(),
                event.getTitle(),
                eventId,
                next.getId(),
                DEFAULT_DEADLINE_HOURS
        );

        log.info("Auto-promotion with deadline: user {} notified for event {} (24h deadline)",
                next.getUser().getId(), eventId);
    }

    private Event findEventOrThrow(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new EventExceptions.EventNotFoundException(id));
    }

    private WaitlistResponse toResponse(EventWaitlist w) {
        long ahead = waitlistRepository.countAhead(w.getEvent().getId(), w.getPosition());
        String statusMessage = buildStatusMessage(w);
        Long minutesRemaining = w.getMinutesRemaining();

        return WaitlistResponse.builder()
                .id(w.getId())
                .eventId(w.getEvent().getId())
                .eventTitle(w.getEvent().getTitle())
                .userId(w.getUser().getId())
                .userName(w.getUser().getFirstName() + " " + w.getUser().getLastName())
                .numberOfSeats(w.getNumberOfSeats())
                .position(w.getPosition())
                .peopleAhead(ahead)
                .joinedAt(w.getJoinedAt())
                .notified(w.isNotified())
                .status(w.getStatus())
                .notifiedAt(w.getNotifiedAt())
                .confirmationDeadline(w.getConfirmationDeadline())
                .minutesRemainingToConfirm(minutesRemaining)
                .statusMessage(statusMessage)
                .build();
    }

    private String buildStatusMessage(EventWaitlist entry) {
        switch (entry.getStatus()) {
            case WAITING:
                return String.format("You are %d%s in the waiting list.",
                        entry.getPosition(), entry.getPosition() == 1 ? "st" : (entry.getPosition() == 2 ? "nd" : "th"));
            case NOTIFIED:
                Long minutesLeft = entry.getMinutesRemaining();
                if (minutesLeft != null && minutesLeft > 0) {
                    long hours = minutesLeft / 60;
                    long minutes = minutesLeft % 60;
                    if (hours > 0) {
                        return String.format("A spot is reserved for you! Confirm within %d hour(s) and %d minute(s).", hours, minutes);
                    }
                    return String.format("A spot is reserved for you! Confirm within %d minute(s).", minutes);
                }
                return "Confirmation deadline has expired.";
            case CONFIRMED:
                return "Your spot has been confirmed.";
            case CANCELLED:
                return "You have left the waiting list.";
            case EXPIRED:
                return "The confirmation deadline has expired.";
            default:
                return "";
        }
    }
}
