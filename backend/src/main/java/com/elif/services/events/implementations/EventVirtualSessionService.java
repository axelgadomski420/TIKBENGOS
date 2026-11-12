package com.elif.services.events.implementations;

import com.elif.dto.events.request.CreateVirtualSessionRequest;
import com.elif.dto.events.response.AttendanceResponse;
import com.elif.dto.events.response.JoinSessionResponse;
import com.elif.dto.events.response.SessionStatsResponse;
import com.elif.dto.events.response.VirtualSessionResponse;
import com.elif.entities.events.*;
import com.elif.entities.notification.enums.NotificationType;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.exceptions.events.EventExceptions;
import com.elif.repositories.events.*;
import com.elif.repositories.user.UserRepository;
import com.elif.services.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class EventVirtualSessionService {

    private static final String JITSI_BASE = "https://meet.jit.si/";
    private static final String ROOM_PREFIX = "elif-event-";

    // ✅ FIX 1 : Injecter l'URL de base depuis application.properties
    @Value("${app.base-url:http://localhost:8087/elif}")
    private String baseUrl;

    private final EventVirtualSessionRepository    sessionRepo;
    private final EventVirtualAttendanceRepository attendanceRepo;
    private final EventRepository                  eventRepo;
    private final EventParticipantRepository       participantRepo;
    private final UserRepository                   userRepo;
    private final AppNotificationService           notifService;

    // ── Création ──────────────────────────────────────────────────

    public VirtualSessionResponse createSession(Long eventId, Long adminId,
                                                CreateVirtualSessionRequest req) {
        Event event = findEventOrThrow(eventId);
        if (sessionRepo.existsByEventId(eventId))
            throw new IllegalStateException("Virtual session already exists for: " + event.getTitle());
        assertEventIsEditable(event);

        String token   = UUID.randomUUID().toString().replace("-", "");
        String modPwd  = generateModPassword(eventId, token);
        String roomUrl = resolveRoomUrl(req.getExternalRoomUrl(), eventId, token);

        EventVirtualSession session = sessionRepo.save(EventVirtualSession.builder()
                .event(event).accessToken(token).roomUrl(roomUrl).moderatorPassword(modPwd)
                .earlyAccessMinutes(req.getEarlyAccessMinutes())
                .attendanceThresholdPercent(req.getAttendanceThresholdPercent())
                .status(VirtualSessionStatus.SCHEDULED).sessionStarted(false).build());

        log.info("🖥️ Session created for '{}' — mod password: {}", event.getTitle(), modPwd);
        return toResponseAdmin(session, modPwd);
    }

    // ── Modérateur ────────────────────────────────────────────────

    public JoinSessionResponse joinAsModerator(Long eventId, Long userId, String password) {
        EventVirtualSession session = findSessionOrThrow(eventId);
        User user = findUserOrThrow(userId);

        if (user.getRole() != Role.ADMIN)
            return fail("Only administrators can join as moderators.");
        if (session.getStatus() != VirtualSessionStatus.OPEN)
            return fail(buildAccessDeniedMessage(session));
        if (!session.getModeratorPassword().equals(password)) {
            log.warn("❌ Wrong moderator password event={} admin={}", eventId, userId);
            return fail("Incorrect moderator password. Check the back-office.");
        }

        if (!session.isSessionStarted()) {
            session.startSession(); sessionRepo.save(session);
            notifyParticipantsSessionStarted(session);
            log.info("🚀 Session STARTED by admin {} for '{}'", userId, session.getEvent().getTitle());
        }

        recordJoin(session, user, true);
        log.info(" Admin {} joined as MODERATOR for '{}'", userId, session.getEvent().getTitle());

        return JoinSessionResponse.builder()
                .roomUrl(buildJitsiUrl(eventId, session.getAccessToken(),
                        encode(user.getFirstName() + " " + user.getLastName() + " [MOD]")))
                .isExternal(true).canJoin(true).isModerator(true).waitingForModerator(false)
                .message("Welcome, moderator! The session has started.").build();
    }

    // ── Participant ───────────────────────────────────────────────

    public JoinSessionResponse joinAsParticipant(Long eventId, Long userId) {
        EventVirtualSession session = findSessionOrThrow(eventId);
        User user = findUserOrThrow(userId);

        if (session.getStatus() != VirtualSessionStatus.OPEN)
            return fail(buildAccessDeniedMessage(session));

        boolean confirmed = participantRepo.existsByEventIdAndUserIdAndStatus(
                eventId, userId, ParticipantStatus.CONFIRMED);
        if (!confirmed) return fail("You are not a confirmed participant for this event.");

        if (!session.isSessionStarted())
            return JoinSessionResponse.builder().canJoin(false).waitingForModerator(true)
                    .message(" Waiting for an administrator to start the session.").build();

        recordJoin(session, user, false);
        log.info("👤 User {} joined as PARTICIPANT for '{}'", userId, session.getEvent().getTitle());

        return JoinSessionResponse.builder()
                .roomUrl(buildJitsiUrl(eventId, session.getAccessToken(),
                        encode(user.getFirstName() + " " + user.getLastName())))
                .isExternal(true).canJoin(true).isModerator(false).waitingForModerator(false)
                .message("Welcome! You have joined the virtual room.").build();
    }

    // ── Quitter ───────────────────────────────────────────────────

    public void leaveSession(Long eventId, Long userId) {
        EventVirtualSession session = findSessionOrThrow(eventId);
        attendanceRepo.findBySessionIdAndUserIdAndLeftAtIsNull(session.getId(), userId)
                .ifPresent(a -> { a.recordLeave(); attendanceRepo.save(a); });
    }

    // ── Lecture ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public VirtualSessionResponse getSession(Long eventId, Long userId) {
        return toResponse(findSessionOrThrow(eventId), userId);
    }

    @Transactional(readOnly = true)
    public VirtualSessionResponse getSessionForAdmin(Long eventId) {
        EventVirtualSession s = findSessionOrThrow(eventId);
        return toResponseAdmin(s, s.getModeratorPassword());
    }

    // ── Stats ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SessionStatsResponse getSessionStats(Long eventId) {
        EventVirtualSession session = findSessionOrThrow(eventId);
        if (session.getStatus() == VirtualSessionStatus.SCHEDULED
                || session.getStatus() == VirtualSessionStatus.OPEN)
            throw new IllegalStateException("Stats available only after the session is closed.");

        long total = participantRepo.countByEventIdAndStatus(eventId, ParticipantStatus.CONFIRMED);

        // Récupérer toutes les présences
        List<EventVirtualAttendance> allAttendances = attendanceRepo.findBySessionId(session.getId());

        // Filtrer pour exclure l'admin
        List<EventVirtualAttendance> filteredAttendances = new ArrayList<>();
        for (EventVirtualAttendance attendance : allAttendances) {
            if (attendance.getUser().getRole() != Role.ADMIN) {
                filteredAttendances.add(attendance);
            }
        }

        long joined = 0;
        double avg = 0.0;
        long certs = 0;

        for (EventVirtualAttendance attendance : filteredAttendances) {
            if (attendance.getAttendancePercent() != null) {
                joined++;
                avg += attendance.getAttendancePercent();
            }
            if (attendance.isCertificateEarned()) {
                certs++;
            }
        }

        // Calculer la moyenne
        if (joined > 0) {
            avg = avg / joined;
        }

        return SessionStatsResponse.builder()
                .sessionId(session.getId())
                .eventTitle(session.getEvent().getTitle())
                .totalRegistered(total)
                .totalJoined(joined)
                .averageAttendance(Math.round(avg * 10.0) / 10.0)
                .certificatesEarned(certs)
                .participantDetails(filteredAttendances.stream()
                        .map(this::toAttendance)
                        .collect(Collectors.toList()))
                .build();
    }

    // ── Schedulers ────────────────────────────────────────────────

    @Scheduled(cron = "0 * * * * *")
    public void openScheduledSessions() {
        LocalDateTime now = LocalDateTime.now();
        for (EventVirtualSession s : sessionRepo.findByStatus(VirtualSessionStatus.SCHEDULED)) {
            if (!now.isBefore(s.getEvent().getStartDate().minusMinutes(s.getEarlyAccessMinutes()))) {
                s.open(); sessionRepo.save(s);
                notifyParticipantsRoomOpen(s);
                log.info("🖥️ Session OPENED for '{}'", s.getEvent().getTitle());
            }
        }
    }

    @Scheduled(cron = "0 * * * * *")
    public void closeExpiredSessions() {
        LocalDateTime now = LocalDateTime.now();
        for (EventVirtualSession s : sessionRepo.findByStatus(VirtualSessionStatus.OPEN)) {
            if (now.isAfter(s.getEvent().getEndDate().plusMinutes(5)))
                closeAndProcess(s);
        }
    }

    // ── Traitement assiduité ──────────────────────────────────────

    // EventVirtualSessionService.java - Modifier la méthode closeAndProcess

    private void closeAndProcess(EventVirtualSession session) {
        session.close();
        sessionRepo.save(session);
        Event event = session.getEvent();
        long dur    = Duration.between(event.getStartDate(), event.getEndDate()).toSeconds();

        attendanceRepo.findBySessionIdAndLeftAtIsNull(session.getId())
                .forEach(a -> { a.recordLeave(); attendanceRepo.save(a); });

        int certs = 0;
        for (EventVirtualAttendance a : attendanceRepo.findBySessionId(session.getId())) {
            a.computeAttendance(dur, session.getAttendanceThresholdPercent());
            if (a.isCertificateEarned()) {
                // ✅ STOCKER LE TOKEN EN BASE
                String certToken = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
                a.setCertificateToken(certToken);
                a.setCertificateUrl(generateCertUrlAbsolute(session, a.getUser(), certToken));
                certs++;
                participantRepo.findByEventIdAndUserId(event.getId(), a.getUser().getId())
                        .ifPresent(p -> { p.setStatus(ParticipantStatus.ATTENDED); participantRepo.save(p); });
            }
            attendanceRepo.save(a);
            sendAttendanceNotif(a, event);
        }
        session.setStatus(VirtualSessionStatus.ARCHIVED);
        sessionRepo.save(session);
        log.info("✅ Session '{}' archived — {} cert(s)", event.getTitle(), certs);
    }

    // Modifier generateCertUrlAbsolute pour accepter le token
    private String generateCertUrlAbsolute(EventVirtualSession session, User user, String token) {
        return String.format("%s/api/certificates/%d/%d/%s",
                baseUrl,
                session.getEvent().getId(),
                user.getId(),
                token);
    }

    // ── Notifications ─────────────────────────────────────────────

    private void notifyParticipantsRoomOpen(EventVirtualSession session) {
        participantRepo.findAllByEventIdAndStatus(session.getEvent().getId(), ParticipantStatus.CONFIRMED)
                .forEach(p -> notifService.create(p.getUser().getId(), null,
                        NotificationType.EVENT_REMINDER, "🖥️ Virtual room is open!",
                        "\"" + session.getEvent().getTitle() + "\" room is ready. Waiting for admin to start.",
                        "/events/" + session.getEvent().getId(), "VIRTUAL_SESSION", session.getId()));
    }

    private void notifyParticipantsSessionStarted(EventVirtualSession session) {
        List<EventParticipant> confirmed = participantRepo
                .findAllByEventIdAndStatus(session.getEvent().getId(), ParticipantStatus.CONFIRMED);
        confirmed.forEach(p -> notifService.create(p.getUser().getId(), null,
                NotificationType.EVENT_REMINDER, "🟢 Session started — join now!",
                "\"" + session.getEvent().getTitle() + "\" has started. Join the virtual room!",
                "/events/" + session.getEvent().getId(), "VIRTUAL_SESSION", session.getId()));
        log.info("  📢 {} participant(s) notified (session started)", confirmed.size());
    }

    private void sendAttendanceNotif(EventVirtualAttendance a, Event event) {
        if (a.getAttendancePercent() == null || a.getAttendancePercent() == 0) return;
        String title = a.isCertificateEarned() ? "🏆 Certificate earned!" : "📊 Attendance recorded";
        String body  = a.isCertificateEarned()
                ? String.format("Your %.1f%% attendance for \"%s\" earned you a certificate.",
                a.getAttendancePercent(), event.getTitle())
                : String.format("Your attendance for \"%s\" was %.1f%%. Min: %d%%.",
                event.getTitle(), a.getAttendancePercent(),
                a.getSession().getAttendanceThresholdPercent());
        notifService.create(a.getUser().getId(), null, NotificationType.EVENT_REMINDER,
                title, body, "/events/" + event.getId(), "VIRTUAL_ATTENDANCE", a.getId());
    }

    // ── Mappers ───────────────────────────────────────────────────

    private VirtualSessionResponse toResponse(EventVirtualSession session, Long userId) {
        Event   event     = session.getEvent();
        boolean confirmed = userId != null
                && participantRepo.existsByEventIdAndUserIdAndStatus(
                event.getId(), userId, ParticipantStatus.CONFIRMED);

        boolean canJoin = session.getStatus() == VirtualSessionStatus.OPEN
                && confirmed
                && session.isSessionStarted();

        boolean waitingMod = confirmed
                && session.getStatus() == VirtualSessionStatus.OPEN
                && !session.isSessionStarted();

        return VirtualSessionResponse.builder()
                .id(session.getId()).eventId(event.getId()).eventTitle(event.getTitle())
                .roomUrl(canJoin ? session.getRoomUrl() : null)
                .earlyAccessMinutes(session.getEarlyAccessMinutes())
                .attendanceThresholdPercent(session.getAttendanceThresholdPercent())
                .status(session.getStatus()).openedAt(session.getOpenedAt()).closedAt(session.getClosedAt())
                .accessWindowStart(event.getStartDate().minusMinutes(session.getEarlyAccessMinutes()))
                .accessWindowEnd(event.getEndDate().plusMinutes(5))
                .canJoinNow(canJoin)
                .sessionStarted(session.isSessionStarted())
                .isConfirmedParticipant(confirmed)
                .waitingForModerator(waitingMod)
                .statusMessage(buildMsg(session, canJoin, confirmed))
                .build();
    }

    private VirtualSessionResponse toResponseAdmin(EventVirtualSession session, String modPwd) {
        Event event = session.getEvent();
        return VirtualSessionResponse.builder()
                .id(session.getId()).eventId(event.getId()).eventTitle(event.getTitle())
                .roomUrl(session.getRoomUrl())
                .earlyAccessMinutes(session.getEarlyAccessMinutes())
                .attendanceThresholdPercent(session.getAttendanceThresholdPercent())
                .status(session.getStatus()).openedAt(session.getOpenedAt()).closedAt(session.getClosedAt())
                .accessWindowStart(event.getStartDate().minusMinutes(session.getEarlyAccessMinutes()))
                .accessWindowEnd(event.getEndDate().plusMinutes(5))
                .canJoinNow(false).sessionStarted(session.isSessionStarted())
                .isConfirmedParticipant(false).waitingForModerator(false)
                .moderatorPassword(modPwd)
                .statusMessage(buildMsg(session, false, false))
                .build();
    }

    private String buildMsg(EventVirtualSession s, boolean canJoin, boolean confirmed) {
        if (canJoin) return "The virtual room is open. You can join now.";
        if (s.getStatus() == VirtualSessionStatus.OPEN) {
            if (confirmed && !s.isSessionStarted())
                return "⏳ You're confirmed! Waiting for an administrator to start the session…";
            if (!confirmed)
                return "Only confirmed participants can join this session.";
        }
        return buildAccessDeniedMessage(s);
    }

    private AttendanceResponse toAttendance(EventVirtualAttendance a) {
        return AttendanceResponse.builder()
                .userId(a.getUser().getId())
                .userName(a.getUser().getFirstName() + " " + a.getUser().getLastName())
                .sessionId(a.getSession().getId()).joinedAt(a.getJoinedAt()).leftAt(a.getLeftAt())
                .totalMinutesPresent(a.getTotalSecondsPresent() / 60)
                .attendancePercent(a.getAttendancePercent()).certificateEarned(a.isCertificateEarned())
                .certificateUrl(a.getCertificateUrl()).currentlyConnected(a.isCurrentlyConnected())
                .build();
    }

    // ── Utils ─────────────────────────────────────────────────────

    private void recordJoin(EventVirtualSession session, User user, boolean isModerator) {
        attendanceRepo.findBySessionIdAndUserIdAndLeftAtIsNull(session.getId(), user.getId())
                .ifPresentOrElse(e -> {},
                        () -> {
                            EventParticipant participant = participantRepo
                                    .findByEventIdAndUserId(session.getEvent().getId(), user.getId())
                                    .orElse(null);

                            EventVirtualAttendance attendance = EventVirtualAttendance.builder()
                                    .session(session)
                                    .user(user)
                                    .participant(participant)
                                    .joinedAt(LocalDateTime.now())
                                    .isModerator(isModerator)
                                    .build();

                            attendanceRepo.save(attendance);
                        });
    }

    private String buildJitsiUrl(Long eventId, String token, String displayName) {
        return JITSI_BASE + ROOM_PREFIX + eventId + "-" + token.substring(0, 8)
                + "#userInfo.displayName=" + displayName;
    }

    private String generateModPassword(Long eventId, String token) {
        return "ELIF-" + eventId + "-" + LocalDateTime.now().getYear()
                + "-" + token.substring(0, 4).toUpperCase();
    }

    private String resolveRoomUrl(String ext, Long eventId, String token) {
        if (ext != null && !ext.isBlank()) return ext;
        return JITSI_BASE + ROOM_PREFIX + eventId + "-" + token.substring(0, 8);
    }


    private String generateCertUrlAbsolute(EventVirtualSession session, User user) {
        String certToken = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return String.format("%s/api/certificates/%d/%d/%s",
                baseUrl,  // ← utilise app.backend.base-url
                session.getEvent().getId(),
                user.getId(),
                certToken);
    }

    // ⚠️ Méthode legacy conservée pour compatibilité, mais plus utilisée
    @Deprecated
    private String generateCertUrl(EventVirtualSession s, User u) {
        return "/certificates/" + s.getEvent().getId() + "/" + u.getId() + "/"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private String buildAccessDeniedMessage(EventVirtualSession s) {
        return switch (s.getStatus()) {
            case SCHEDULED -> {
                long min = Duration.between(LocalDateTime.now(),
                        s.getEvent().getStartDate().minusMinutes(s.getEarlyAccessMinutes())).toMinutes();
                yield min > 0 ? "The room opens in " + min + " minute(s)." : "The room is about to open.";
            }
            case CLOSED   -> "This session has ended.";
            case ARCHIVED -> "This session is archived.";
            default       -> "Room access is unavailable.";
        };
    }

    private JoinSessionResponse fail(String msg) {
        return JoinSessionResponse.builder().canJoin(false).message(msg).build();
    }

    private String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    private Event findEventOrThrow(Long id) {
        return eventRepo.findById(id).orElseThrow(() -> new EventExceptions.EventNotFoundException(id));
    }

    private EventVirtualSession findSessionOrThrow(Long eventId) {
        return sessionRepo.findByEventId(eventId)
                .orElseThrow(() -> new IllegalStateException("No virtual session for event: " + eventId));
    }

    private User findUserOrThrow(Long userId) {
        return userRepo.findById(userId)
                .orElseThrow(() -> new EventExceptions.ParticipantNotFoundException("User not found: " + userId));
    }

    private void assertEventIsEditable(Event event) {
        if (event.getStatus() == EventStatus.COMPLETED || event.getStatus() == EventStatus.CANCELLED)
            throw new EventExceptions.EventNotEditableException(event.getStatus().name());
    }
}