package com.elif.services.adoption.impl;

import com.elif.entities.adoption.Appointment;
import com.elif.entities.adoption.AdoptionRequest;
import com.elif.entities.adoption.enums.RequestStatus;
import com.elif.repositories.adoption.AppointmentRepository;
import com.elif.repositories.adoption.AdoptionRequestRepository;
import com.elif.repositories.adoption.ShelterRepository;
import com.elif.services.adoption.interfaces.IAppointmentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Transactional
public class AppointmentService implements IAppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AdoptionRequestRepository requestRepository;
    private final ShelterRepository shelterRepository;
    private final EmailService emailService;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              AdoptionRequestRepository requestRepository,
                              ShelterRepository shelterRepository,
                              EmailService emailService) {
        this.appointmentRepository = appointmentRepository;
        this.requestRepository     = requestRepository;
        this.shelterRepository     = shelterRepository;
        this.emailService          = emailService;
    }

    // ============================================================
    // PLANIFIER UN RENDEZ-VOUS
    // ============================================================

    @Override
    public Appointment scheduleAppointment(Long requestId, LocalDateTime appointmentDate,
                                           String shelterNotes, Integer compatibilityScore) {

        AdoptionRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        // Vérifier conflit de créneau (±30 min)
        LocalDateTime start = appointmentDate.minusMinutes(30);
        LocalDateTime end   = appointmentDate.plusMinutes(30);
        List<Appointment> conflicts = appointmentRepository
                .findConflictingAppointments(request.getPet().getId(), start, end);

        if (!conflicts.isEmpty()) {
            throw new RuntimeException(
                    "Time slot conflict: another appointment is already scheduled at this time for this pet. " +
                            "Please choose a different time slot.");
        }

        Appointment appointment = new Appointment();
        appointment.setRequest(request);
        appointment.setPet(request.getPet());
        appointment.setAdopter(request.getAdopter());
        appointment.setShelter(request.getPet().getShelter());
        appointment.setAppointmentDate(appointmentDate);
        appointment.setShelterNotes(shelterNotes);
        appointment.setCompatibilityScore(compatibilityScore);
        appointment.setStatus("SCHEDULED");

        appointment = appointmentRepository.save(appointment);

        // Mettre la demande en UNDER_REVIEW
        request.setStatus(RequestStatus.UNDER_REVIEW);
        requestRepository.save(request);

        // Envoyer email de notification à l'adoptant
        final Appointment finalAppointment = appointment;
        new Thread(() -> sendAppointmentEmail(finalAppointment)).start();

        return appointment;
    }

    // ============================================================
    // RÉPONDRE APRÈS CONSULTATION
    // ============================================================

    @Override
    public Appointment respondAfterConsultation(Long appointmentId, String result,
                                                String responseMessage) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found: " + appointmentId));

        appointment.setConsultationResult(result);
        appointment.setResponseMessage(responseMessage);
        appointment.setStatus("COMPLETED");
        appointment.setUpdatedAt(LocalDateTime.now());

        appointment = appointmentRepository.save(appointment);

        // Envoyer email de réponse
        final Appointment finalAppointment = appointment;
        new Thread(() -> sendConsultationResponseEmail(finalAppointment)).start();

        return appointment;
    }

    // ============================================================
    // ANNULER UN RENDEZ-VOUS
    // ============================================================

    @Override
    public Appointment cancelAppointment(Long appointmentId, String reason) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found: " + appointmentId));

        appointment.setStatus("CANCELLED");
        appointment.setShelterNotes(reason);
        appointment.setUpdatedAt(LocalDateTime.now());

        return appointmentRepository.save(appointment);
    }

    // ============================================================
    // LECTURES
    // ============================================================

    @Override
    public List<Appointment> getByShelter(Long shelterId) {
        return appointmentRepository.findByShelterIdOrderByAppointmentDateAsc(shelterId);
    }

    @Override
    public List<Appointment> getUpcomingByShelter(Long shelterId) {
        return appointmentRepository.findUpcomingByShelter(shelterId, LocalDateTime.now());
    }

    @Override
    public List<Appointment> getByAdopter(Long adopterId) {
        return appointmentRepository.findByAdopterIdOrderByAppointmentDateAsc(adopterId);
    }

    @Override
    public List<Appointment> getByRequest(Long requestId) {
        return appointmentRepository.findByRequestId(requestId);
    }

    @Override
    public Appointment getById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found: " + id));
    }

    // ============================================================
    // EMAILS
    // ============================================================

    private void sendAppointmentEmail(Appointment appointment) {
        if (appointment.getAdopter() == null ||
                appointment.getAdopter().getEmail() == null) return;

        try {
            String to        = appointment.getAdopter().getEmail();
            String firstName = appointment.getAdopter().getFirstName();
            String petName   = appointment.getPet() != null ? appointment.getPet().getName() : "the animal";
            String shelter   = appointment.getShelter() != null ? appointment.getShelter().getName() : "the shelter";
            String date      = appointment.getAppointmentDate()
                    .format(DateTimeFormatter.ofPattern("EEEE dd MMMM yyyy 'at' HH:mm"));

            String subject = "📅 Appointment Scheduled — Visit " + petName;
            String body = buildAppointmentEmailHtml(firstName, petName, shelter, date,
                    appointment.getShelterNotes(), appointment.getCompatibilityScore());

            emailService.sendHtmlEmail(to, subject, body);
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send appointment email: " + e.getMessage());
        }
    }

    private void sendConsultationResponseEmail(Appointment appointment) {
        if (appointment.getAdopter() == null ||
                appointment.getAdopter().getEmail() == null) return;

        try {
            String to        = appointment.getAdopter().getEmail();
            String firstName = appointment.getAdopter().getFirstName();
            String petName   = appointment.getPet() != null ? appointment.getPet().getName() : "the animal";
            boolean approved = "APPROVED".equals(appointment.getConsultationResult());

            String subject = approved
                    ? "🎉 Congratulations! Your adoption of " + petName + " is approved"
                    : "Update on your adoption request for " + petName;

            String body = buildResponseEmailHtml(firstName, petName, approved,
                    appointment.getResponseMessage());

            emailService.sendHtmlEmail(to, subject, body);
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send response email: " + e.getMessage());
        }
    }

    private String buildAppointmentEmailHtml(String firstName, String petName,
                                             String shelter, String date,
                                             String notes, Integer score) {
        return """
                <!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>
                  body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0}
                  .container{max-width:600px;margin:30px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
                  .header{background:rgb(58,146,130);padding:28px;text-align:center}
                  .header h1{color:white;margin:0;font-size:22px}
                  .header p{color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px}
                  .body{padding:28px}
                  .info-box{background:#f0fff4;border-left:4px solid rgb(58,146,130);border-radius:8px;padding:16px;margin:16px 0}
                  .info-box p{margin:4px 0;font-size:13px;color:#2d3748}
                  .info-box strong{color:rgb(58,146,130)}
                  .score{display:inline-block;background:rgb(58,146,130);color:white;padding:6px 14px;border-radius:20px;font-weight:bold;font-size:13px}
                  .footer{background:#f4f6f8;padding:14px;text-align:center;font-size:11px;color:#a0aec0}
                </style></head><body>
                <div class="container">
                  <div class="header"><h1>📅 Appointment Scheduled!</h1>
                  <p>Your on-site consultation has been confirmed</p></div>
                  <div class="body">
                    <p>Hello <strong>%s</strong>,</p>
                    <p>The shelter <strong>%s</strong> would like to invite you for an on-site visit to meet <strong>%s</strong>!</p>
                    <div class="info-box">
                      <p><strong>📅 Date & Time:</strong> %s</p>
                      <p><strong>🏠 Shelter:</strong> %s</p>
                      <p><strong>🐾 Animal:</strong> %s</p>
                      %s
                    </div>
                    %s
                    <p>Please arrive on time. If you cannot make it, contact the shelter as soon as possible.</p>
                  </div>
                  <div class="footer">This email was sent automatically. Please do not reply.</div>
                </div></body></html>
                """.formatted(
                firstName, shelter, petName, date, shelter, petName,
                notes != null && !notes.isBlank()
                        ? "<p><strong>📝 Shelter notes:</strong> " + notes + "</p>" : "",
                score != null
                        ? "<p>Your compatibility score: <span class=\"score\">" + score + "/100</span></p>" : ""
        );
    }

    private String buildResponseEmailHtml(String firstName, String petName,
                                          boolean approved, String message) {
        String color = approved ? "rgb(58,146,130)" : "#e53e3e";
        String icon  = approved ? "🎉" : "📋";
        String title = approved
                ? "Adoption Approved!"
                : "Update on Your Adoption Request";

        return """
                <!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>
                  body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0}
                  .container{max-width:600px;margin:30px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
                  .header{background:%s;padding:28px;text-align:center}
                  .header h1{color:white;margin:0;font-size:22px}
                  .body{padding:28px}
                  .msg-box{background:#f7fafc;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#2d3748;line-height:1.6}
                  .footer{background:#f4f6f8;padding:14px;text-align:center;font-size:11px;color:#a0aec0}
                </style></head><body>
                <div class="container">
                  <div class="header"><h1>%s %s</h1></div>
                  <div class="body">
                    <p>Hello <strong>%s</strong>,</p>
                    <p>Following your on-site consultation for <strong>%s</strong>, the shelter has responded:</p>
                    <div class="msg-box">%s</div>
                    %s
                  </div>
                  <div class="footer">This email was sent automatically. Please do not reply.</div>
                </div></body></html>
                """.formatted(
                color, icon, title, firstName, petName,
                message != null ? message : "No additional message.",
                approved ? "<p>🎊 Congratulations! You can now check your contract in <strong>My Contracts</strong>.</p>" : ""
        );
    }
}