package com.elif.controllers.events;

import com.elif.entities.events.EventVirtualAttendance;
import com.elif.repositories.events.EventVirtualAttendanceRepository;
import com.elif.services.events.implementations.EventEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDate;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;

@RestController
@RequestMapping("/api/certificates")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true", allowedHeaders = "*")
@RequiredArgsConstructor
@Slf4j
public class CertificateController {

    private static final DateTimeFormatter DATE_EN =
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH);

    // Template paths  (under resources/templates/)
    private static final String TEMPLATE_CERTIFICATE = "emails/certificate";
    private static final String TEMPLATE_ERROR       = "emails/certificate-error";

    private final EventVirtualAttendanceRepository attendanceRepo;
    private final EventEmailService                emailService;
    private final TemplateEngine                   templateEngine;

    // ─────────────────────────────────────────────────────────────────────────
    // GET  /api/certificates/{eventId}/{userId}
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping(value = "/{eventId}/{userId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getCertificate(
            @PathVariable Long eventId,
            @PathVariable Long userId) {

        log.info("Certificate requested: eventId={}, userId={}", eventId, userId);

        Optional<EventVirtualAttendance> opt =
                attendanceRepo.findBySessionEventIdAndUserId(eventId, userId);

        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.TEXT_HTML)
                    .body(renderError(
                            "Certificate Not Found",
                            "No attendance record was found for this event.",
                            "Please ensure you attended the virtual session."
                    ));
        }

        EventVirtualAttendance attendance = opt.get();

        if (!attendance.isCertificateEarned()) {
            double percent = attendance.getAttendancePercent() != null
                    ? attendance.getAttendancePercent() : 0.0;
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .contentType(MediaType.TEXT_HTML)
                    .body(renderError(
                            "Certificate Not Earned",
                            String.format(Locale.US,
                                    "Your attendance was %.1f%%, below the required threshold.", percent),
                            "Minimum attendance is required before a certificate can be issued."
                    ));
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0")
                .contentType(MediaType.TEXT_HTML)
                .body(renderCertificate(attendance, eventId, userId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/certificates/{eventId}/{userId}/send
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/{eventId}/{userId}/send")
    public ResponseEntity<String> sendCertificateByEmail(
            @PathVariable Long eventId,
            @PathVariable Long userId) {

        log.info("Send certificate email: eventId={}, userId={}", eventId, userId);

        Optional<EventVirtualAttendance> opt =
                attendanceRepo.findBySessionEventIdAndUserId(eventId, userId);

        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Attendance record not found.");
        }

        EventVirtualAttendance attendance = opt.get();

        if (!attendance.isCertificateEarned()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Certificate not earned.");
        }

        String toEmail    = attendance.getUser().getEmail();
        String firstName  = attendance.getUser().getFirstName();
        String certUrl    = "http://localhost:8087/elif/api/certificates/" + eventId + "/" + userId;
        String eventTitle = attendance.getSession().getEvent().getTitle();
        double percent    = attendance.getAttendancePercent() != null
                ? attendance.getAttendancePercent() : 0.0;
        int threshold     = attendance.getSession().getAttendanceThresholdPercent();

        emailService.sendAttendanceResultEmail(
                toEmail, firstName, eventTitle, percent, threshold, true, certUrl);

        log.info("Certificate email sent to: {}", toEmail);
        return ResponseEntity.ok("Certificate email sent to " + toEmail);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — Thymeleaf rendering
    // ─────────────────────────────────────────────────────────────────────────

    private String renderCertificate(EventVirtualAttendance attendance,
                                     Long eventId, Long userId) {

        String userName = joinName(
                attendance.getUser().getFirstName(),
                attendance.getUser().getLastName()
        );
        String eventTitle = nullSafe(attendance.getSession().getEvent().getTitle(), "Virtual Event");
        String eventDate  = attendance.getSession().getEvent().getStartDate() != null
                ? attendance.getSession().getEvent().getStartDate().format(DATE_EN)
                : "N/A";
        String attendancePct = String.format(
                Locale.US, "%.1f%%",
                attendance.getAttendancePercent() != null ? attendance.getAttendancePercent() : 0.0
        );
        long   minutes    = Math.max(0, attendance.getTotalSecondsPresent() / 60);
        String issuedDate = LocalDate.now().format(DATE_EN);
        String certId     = "ELIF-CERT-" + eventId + "-" + userId + "-" + Year.now().getValue();

        Context ctx = new Context(Locale.ENGLISH);
        ctx.setVariable("userName",   userName);
        ctx.setVariable("eventTitle", eventTitle);
        ctx.setVariable("eventDate",  eventDate);
        ctx.setVariable("attendance", attendancePct);
        ctx.setVariable("minutes",    minutes);
        ctx.setVariable("issuedDate", issuedDate);
        ctx.setVariable("certId",     certId);

        return templateEngine.process(TEMPLATE_CERTIFICATE, ctx);
    }

    private String renderError(String title, String message, String hint) {
        Context ctx = new Context(Locale.ENGLISH);
        ctx.setVariable("title",   title);
        ctx.setVariable("message", message);
        ctx.setVariable("hint",    hint);
        return templateEngine.process(TEMPLATE_ERROR, ctx);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utility
    // ─────────────────────────────────────────────────────────────────────────

    private String joinName(String firstName, String lastName) {
        String combined = (nullSafe(firstName, "") + " " + nullSafe(lastName, "")).trim();
        return combined.isEmpty() ? "Participant" : combined;
    }

    private String nullSafe(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value.trim();
    }
}