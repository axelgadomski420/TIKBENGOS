package com.elif.services.events.implementations;

import com.elif.dto.events.request.EventParticipantRequest;
import com.elif.dto.events.response.EventParticipantResponse;
import com.elif.entities.events.*;
import com.elif.entities.notification.enums.NotificationType;
import com.elif.entities.user.User;
import com.elif.exceptions.events.EventExceptions;
import com.elif.repositories.events.EventParticipantRepository;
import com.elif.repositories.events.EventRepository;
import com.elif.repositories.events.PetCompetitionEntryRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.services.events.interfaces.IEventParticipantService;
import com.elif.services.events.interfaces.IEventAnalyticsService;
import com.elif.services.events.interfaces.IEventReminderService;
import com.elif.services.events.interfaces.IEventWaitlistService;
import com.elif.services.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional
@RequiredArgsConstructor
public class EventParticipantServiceImpl implements IEventParticipantService {
    private static final List<ParticipantStatus> ACTIVE_PARTICIPANT_STATUSES = Arrays.asList(
            ParticipantStatus.CONFIRMED,
            ParticipantStatus.PENDING
    );

    private final EventRepository eventRepository;
    private final EventParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final PetCompetitionEntryRepository petEntryRepository;
    private final IEventReminderService reminderService;
    private final AppNotificationService notificationService;
    private final EventEmailService emailService;
    private final EventEligibilityService eligibilityService;
    private final IEventAnalyticsService analyticsService;

    @Lazy
    private final IEventWaitlistService waitlistService;
    @Override
    public EventParticipantResponse registerToEvent(Long eventId, Long userId,
                                                    EventParticipantRequest request) {
        Event event = findEventOrThrow(eventId);

        if (!event.isJoinable())
            throw new EventExceptions.EventNotJoinableException(event.getStatus().name().toLowerCase());

        if (participantRepository.existsActiveByEventIdAndUserId(eventId, userId, ACTIVE_PARTICIPANT_STATUSES))
            throw new EventExceptions.DuplicateRegistrationException(userId, eventId);

        EventCategory category = event.getCategory();
        boolean isCompetition = category != null && Boolean.TRUE.equals(category.getCompetitionMode());

        Integer eligibilityScore = null;
        String eligibilityVerdict = null;
        String satisfiedRules = null;
        String warnings = null;
        EventEligibilityService.EligibilityResult result = null;  // ✅ Stocker le résultat

        // ── ÉTAPE 1 : Éligibilité (compétitions uniquement) ───────────────
        if (isCompetition) {
            if (request.getPetData() == null)
                throw new EventExceptions.EligibilityViolationException(
                        0, "Animal data is required for competition events.");

            result = eligibilityService.evaluate(event, request.getPetData(), userId);

            eligibilityScore = result.getScore();
            eligibilityVerdict = result.getVerdict().name();

            satisfiedRules = result.getSatisfiedRules().isEmpty() ? null
                    : String.join(" | ", result.getSatisfiedRules());

            warnings = result.getSoftViolations().isEmpty() ? null
                    : result.getSoftViolations().stream()
                    .map(EventEligibilityService.RuleViolation::message)
                    .collect(java.util.stream.Collectors.joining(" | "));

            if (result.isRejected()) {
                String violations = result.getBlockingViolations().isEmpty()
                        ? "Score too low: " + result.getScore() + "/100 (minimum: "
                        + EventEligibilityService.THRESHOLD_AUTO_REJECT + "/100)"
                        : result.getBlockingViolations().stream()
                        .map(v -> "• " + v.message())
                        .collect(java.util.stream.Collectors.joining("\n"));

                log.info("❌ Rejet userId={} '{}' score={}/100 decision={}",
                        userId, event.getTitle(), eligibilityScore, result.getDecision());

                throw new EventExceptions.EligibilityViolationException(
                        eligibilityScore, violations);
            }

            log.info("{} userId={} '{}' score={}/100 decision={}",
                    result.hasWarnings() ? "⚠️ PENDING" : "✅ ELIGIBLE",
                    userId, event.getTitle(), eligibilityScore, result.getDecision());
        }

        // ── ÉTAPE 2 : Places disponibles ──────────────────────────────────
        int requested = request.getNumberOfSeats();
        if (event.getRemainingSlots() < requested)
            throw new EventExceptions.InsufficientSlotsException(event.getRemainingSlots(), requested);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException(
                        "User not found: " + userId));

        // ── ÉTAPE 3 : Statut initial selon décision ────────────────────────
        ParticipantStatus initialStatus;

        if (isCompetition) {
            // ✅ Utiliser le result déjà évalué
            initialStatus = result.isAutoAdmit()
                    ? ParticipantStatus.CONFIRMED
                    : ParticipantStatus.PENDING;
        } else {
            boolean requiresApproval = category != null
                    && Boolean.TRUE.equals(category.getRequiresApproval());
            initialStatus = requiresApproval
                    ? ParticipantStatus.PENDING
                    : ParticipantStatus.CONFIRMED;
        }

        // Décrémente les places uniquement si CONFIRMED
        if (initialStatus == ParticipantStatus.CONFIRMED) {
            event.decrementSlots(requested);
            eventRepository.save(event);
        }

        // ── ÉTAPE 4 : Sauvegarde participant ──────────────────────────────
        EventParticipant participant = findCancelledParticipant(eventId, userId)
                .orElseGet(EventParticipant::new);

        participant.setEvent(event);
        participant.setUser(user);
        participant.setNumberOfSeats(requested);
        participant.setStatus(initialStatus);
        participant.setEligibilityScore(eligibilityScore);

        if (participant.getId() != null) {
            petEntryRepository.deleteByParticipantId(participant.getId());
        }

        EventParticipant saved = participantRepository.save(participant);

        // ── ÉTAPE 5 : Sauvegarde dossier animal (compétition) ─────────────
        if (isCompetition && request.getPetData() != null) {
            EventEligibilityService.PetRegistrationData pet = request.getPetData();
            petEntryRepository.save(PetCompetitionEntry.builder()
                    .participant(saved).event(event).user(user)
                    .petName(pet.petName() != null ? pet.petName() : "—")
                    .species(pet.species()).breed(pet.breed())
                    .ageMonths(pet.ageMonths()).weightKg(pet.weightKg())
                    .sex(pet.sex()).color(pet.color())
                    .isVaccinated(Boolean.TRUE.equals(pet.isVaccinated()))
                    .hasLicense(Boolean.TRUE.equals(pet.hasLicense()))
                    .hasMedicalCert(Boolean.TRUE.equals(pet.hasMedicalCert()))
                    .experienceLevel(pet.experienceLevel())
                    .additionalInfo(pet.additionalInfo())
                    .eligibilityScore(eligibilityScore)
                    .eligibilityVerdict(eligibilityVerdict)
                    .satisfiedRules(satisfiedRules)
                    .warnings(warnings)
                    .build());

            log.info("🐾 Dossier sauvegardé — userId={} breed='{}' score={}",
                    userId, pet.breed(), eligibilityScore);
        }

        // ── ÉTAPE 6 : Notifications + Emails ─────────────────────────────
        if (initialStatus == ParticipantStatus.CONFIRMED) {
            reminderService.scheduleReminders(event, user);
            analyticsService.trackAsync(event.getId(), InteractionType.REGISTRATION, user.getId(), null, null);

            notificationService.create(event.getCreatedBy().getId(), userId,
                    NotificationType.REGISTRATION_CONFIRMED, "New confirmed registration",
                    user.getFirstName() + " " + user.getLastName() +
                            " registered for \"" + event.getTitle() + "\"" +
                            (isCompetition ? " — score " + eligibilityScore + "/100 ✅" : ""),
                    "/events/" + eventId + "/participants", "EVENT", eventId);

            if (user.getEmail() != null) {
                emailService.sendRegistrationConfirmedWithTicket(
                        user.getEmail(),
                        user.getFirstName(),
                        event,
                        user,
                        saved
                );
            }

        } else {
            analyticsService.trackAsync(event.getId(), InteractionType.REGISTRATION, user.getId(), null, null);
            String adminMsg = isCompetition
                    ? user.getFirstName() + " " + user.getLastName() +
                    " submitted a competition entry for \"" + event.getTitle() + "\" — score " +
                    eligibilityScore + "/100 ⏳"
                    : user.getFirstName() + " " + user.getLastName() +
                    " requested to join \"" + event.getTitle() + "\"";

            notificationService.create(event.getCreatedBy().getId(), userId,
                    NotificationType.REGISTRATION_PENDING, "New pending registration",
                    adminMsg, "/events/" + eventId + "/participants/pending", "EVENT", eventId);

            if (user.getEmail() != null)
                emailService.sendRegistrationPending(user.getEmail(), user.getFirstName(), event.getTitle());
        }

        return toResponse(saved);
    }
    // ─────────────────────────────────────────────
    // CREATE PET ENTRY
    // ─────────────────────────────────────────────
    private PetCompetitionEntry createPetEntry(
            Event event,
            User user,
            EventEligibilityService.PetRegistrationData petData,
            EventEligibilityService.EligibilityResult eligibility) {

        String verdict;
        int score = eligibility.getScore();
        if (score >= 80) {
            verdict = "ELIGIBLE";
        } else if (score >= 50) {
            verdict = "WARNING";
        } else {
            verdict = "INELIGIBLE";
        }

        return PetCompetitionEntry.builder()
                .event(event)
                .user(user)
                .petName(petData.petName())
                .species(petData.species())
                .breed(petData.breed())
                .ageMonths(petData.ageMonths())
                .weightKg(petData.weightKg())
                .sex(petData.sex())
                .color(petData.color())
                .isVaccinated(petData.isVaccinated())
                .hasLicense(petData.hasLicense())
                .hasMedicalCert(petData.hasMedicalCert())
                .experienceLevel(petData.experienceLevel())
                .eligibilityScore(score)
                .eligibilityVerdict(verdict)
                .satisfiedRules(String.join(", ", eligibility.getSatisfiedRules()))
                .warnings(eligibility.getSoftViolations().stream()
                        .map(v -> v.message())
                        .collect(Collectors.joining(", ")))
                .build();
    }

    // ─────────────────────────────────────────────
    // CANCEL REGISTRATION
    // ─────────────────────────────────────────────
    @Override
    public void cancelRegistration(Long eventId, Long userId) {
        EventParticipant participant = participantRepository
                .findFirstByEventIdAndUserIdAndStatusInOrderByRegisteredAtDesc(
                        eventId,
                        userId,
                        ACTIVE_PARTICIPANT_STATUSES
                )
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException(
                        "Registration not found for event " + eventId + "."));

        if (participant.getStatus() == ParticipantStatus.CANCELLED) {
            throw new EventExceptions.EventNotEditableException("already cancelled");
        }

        Event event = participant.getEvent();
        User user = participant.getUser();

        if (event.getStatus() == EventStatus.COMPLETED) {
            throw new EventExceptions.EventNotEditableException(
                    "completed — cannot cancel registration");
        }

        if (participant.getStatus() == ParticipantStatus.CONFIRMED) {
            event.releaseSlots(participant.getNumberOfSeats());
            if (event.getStatus() == EventStatus.FULL) {
                event.setStatus(EventStatus.PLANNED);
            }
            eventRepository.save(event);

            waitlistService.promoteFirstWaitingWithDeadline(eventId);
        }

        participant.setStatus(ParticipantStatus.CANCELLED);
        participantRepository.save(participant);

        reminderService.cancelReminders(eventId, userId);

        notificationService.create(
                event.getCreatedBy().getId(),
                userId,
                NotificationType.REGISTRATION_CANCELLED,
                "Registration cancelled",
                user.getFirstName() + " " + user.getLastName() +
                        " cancelled their registration for \"" + event.getTitle() + "\"",
                "/events/" + eventId + "/participants",
                "EVENT",
                eventId
        );

        emailService.sendRegistrationCancelled(
                event.getCreatedBy().getEmail(),
                event.getCreatedBy().getFirstName(),
                event.getTitle()
        );

        log.info("Registration cancelled — userId={}, eventId={}", userId, eventId);
    }

    // ─────────────────────────────────────────────
    // APPROVE PARTICIPANT
    // ─────────────────────────────────────────────
    @Override
    public EventParticipantResponse approveParticipant(Long participantId, Long adminId) {
        EventParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException(
                        "Registration not found: " + participantId));

        if (participant.getStatus() != ParticipantStatus.PENDING) {
            throw new EventExceptions.RegistrationNotPendingException();
        }

        Event event = participant.getEvent();
        if (event.getRemainingSlots() < participant.getNumberOfSeats()) {
            throw new EventExceptions.InsufficientSlotsException(
                    event.getRemainingSlots(), participant.getNumberOfSeats());
        }

        event.decrementSlots(participant.getNumberOfSeats());
        if (event.getRemainingSlots() == 0) {
            event.setStatus(EventStatus.FULL);
        }
        eventRepository.save(event);

        participant.setStatus(ParticipantStatus.CONFIRMED);
        EventParticipant saved = participantRepository.save(participant);

        reminderService.scheduleReminders(event, participant.getUser());
        log.info("Registration {} approved by admin {} -> '{}'",
                participantId, adminId, event.getTitle());

        notificationService.create(
                participant.getUser().getId(),
                adminId,
                NotificationType.REGISTRATION_APPROVED,
                "Your registration has been approved!",
                "Your participation in \"" + event.getTitle() + "\" is now confirmed. " +
                        "You will receive reminders before the event.",
                "/events/" + event.getId(),
                "EVENT",
                event.getId()
        );

        emailService.sendRegistrationConfirmedWithTicket(
                participant.getUser().getEmail(),
                participant.getUser().getFirstName(),
                event,
                participant.getUser(),
                saved
        );

        return toResponse(saved);
    }

    // ─────────────────────────────────────────────
    // REJECT PARTICIPANT
    // ─────────────────────────────────────────────
    @Override
    public EventParticipantResponse rejectParticipant(Long participantId, Long adminId) {
        EventParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException(
                        "Registration not found: " + participantId));

        if (participant.getStatus() != ParticipantStatus.PENDING) {
            throw new EventExceptions.RegistrationNotPendingException();
        }

        Event event = participant.getEvent();
        participant.setStatus(ParticipantStatus.CANCELLED);
        EventParticipant saved = participantRepository.save(participant);

        log.info("Registration {} rejected by admin {}", participantId, adminId);

        notificationService.create(
                participant.getUser().getId(),
                adminId,
                NotificationType.REGISTRATION_REJECTED,
                "Your registration has been rejected",
                "Your request for \"" + event.getTitle() + "\" was not approved. " +
                        "You can register for other events.",
                "/events/" + event.getId(),
                "EVENT",
                event.getId()
        );

        emailService.sendRegistrationRejected(
                participant.getUser().getEmail(),
                participant.getUser().getFirstName(),
                event.getTitle()
        );

        return toResponse(saved);
    }

    // ─────────────────────────────────────────────
    // GET PENDING PARTICIPANTS
    // ─────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public Page<EventParticipantResponse> getPendingParticipants(Long eventId, Long adminId,
                                                                 Pageable pageable) {
        findEventOrThrow(eventId);
        return participantRepository
                .findByEventIdAndStatus(eventId, ParticipantStatus.PENDING, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────────
    // GET CONFIRMED PARTICIPANTS
    // ─────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public Page<EventParticipantResponse> getEventParticipants(Long eventId, Long requesterId,
                                                               Pageable pageable) {
        findEventOrThrow(eventId);
        return participantRepository
                .findByEventIdAndStatus(eventId, ParticipantStatus.CONFIRMED, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────────
    // GET MY REGISTRATIONS
    // ─────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public Page<EventParticipantResponse> getMyRegistrations(Long userId, Pageable pageable) {
        return participantRepository
                .findByUserIdOrderByRegisteredAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────────
    // IS USER REGISTERED
    // ─────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public boolean isUserRegistered(Long eventId, Long userId) {
        return participantRepository.existsActiveByEventIdAndUserId(eventId, userId, ACTIVE_PARTICIPANT_STATUSES);
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────
    private Event findEventOrThrow(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new EventExceptions.EventNotFoundException(id));
    }

    private java.util.Optional<EventParticipant> findCancelledParticipant(Long eventId, Long userId) {
        return participantRepository.findFirstByEventIdAndUserIdAndStatusInOrderByRegisteredAtDesc(
                eventId,
                userId,
                Arrays.asList(ParticipantStatus.CANCELLED)
        );
    }

    private EventParticipantResponse toResponse(EventParticipant p) {
        return EventParticipantResponse.builder()
                .id(p.getId())
                .eventId(p.getEvent().getId())
                .eventTitle(p.getEvent().getTitle())
                .userId(p.getUser() != null ? p.getUser().getId() : null)
                .userName(p.getUser() != null
                        ? p.getUser().getFirstName() + " " + p.getUser().getLastName() : null)
                .numberOfSeats(p.getNumberOfSeats())
                .status(p.getStatus())
                .registeredAt(p.getRegisteredAt())
                .eligibilityScore(p.getEligibilityScore())
                .build();
    }
}
