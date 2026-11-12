package com.elif.services.adoption.impl;

import com.elif.entities.adoption.Contract;
import com.elif.entities.pet_transit.TravelDestination;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.repositories.pet_profile.PetProfileRepository;
import com.elif.services.adoption.interfaces.IEmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Service
public class EmailService implements IEmailService {

    // ✅ Package-accessible pour AppointmentService
    final JavaMailSender mailSender;
    private final PetProfileRepository petProfileRepository;

    @Value("${app.mail.from:${spring.mail.username:}}")
    String fromEmail;

    @Value("${app.frontend.base-url:http://localhost:4200}")
    String frontendBaseUrl;

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TRAVEL_DATE_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy");

    public EmailService(JavaMailSender mailSender, PetProfileRepository petProfileRepository) {
        this.mailSender = mailSender;
        this.petProfileRepository = petProfileRepository;
    }

    // ✅ GETTERS pour permettre l'accès depuis AppointmentService
    public JavaMailSender getMailSender() {
        return mailSender;
    }

    public String getFromEmail() {
        return fromEmail;
    }

    // ============================================================
    // MÉTHODES DE L'INTERFACE
    // ============================================================

    public void sendRegistrationConfirmed(String toEmail, String firstName, String eventTitle, Long eventId, String eventLocation, LocalDateTime startDate) {

    }

    public void sendRegistrationPending(String toEmail, String firstName, String eventTitle) {

    }

    public void sendRegistrationApproved(String toEmail, String firstName, String eventTitle, Long eventId) {

    }

    public void sendRegistrationRejected(String toEmail, String firstName, String eventTitle) {

    }

    public void sendRegistrationCancelled(String toEmail, String firstName, String eventTitle) {

    }

    public void sendWaitlistOffer(String toEmail, String firstName, String eventTitle, Long eventId, Long waitlistEntryId, int deadlineHours) {

    }

    public void sendWaitlistExpired(String toEmail, String firstName, String eventTitle) {

    }

    public void sendEventReminder(String toEmail, String firstName, String eventTitle, Long eventId, String location, LocalDateTime startDate, String reminderLabel) {

    }

    @Override
    public void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            if (fromEmail != null && !fromEmail.isBlank()) {
                helper.setFrom(Objects.requireNonNull(fromEmail));
            }
            helper.setTo(Objects.requireNonNull(to));
            helper.setSubject(Objects.requireNonNull(subject));
            helper.setText(Objects.requireNonNull(htmlBody), true);
            mailSender.send(message);
            System.out.println("✅ HTML email sent to: " + to);
        } catch (MessagingException e) {
            System.err.println("❌ Failed to send HTML email to " + to + ": " + e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }

    @Override
    public void sendTextEmail(String to, String subject, String textBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            if (fromEmail != null && !fromEmail.isBlank()) {
                helper.setFrom(Objects.requireNonNull(fromEmail));
            }
            helper.setTo(Objects.requireNonNull(to));
            helper.setSubject(Objects.requireNonNull(subject));
            helper.setText(Objects.requireNonNull(textBody), false);
            mailSender.send(message);
            System.out.println("✅ Text email sent to: " + to);
        } catch (MessagingException e) {
            System.err.println("❌ Failed to send text email to " + to + ": " + e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }

    // ============================================================
    // EMAIL SPÉCIFIQUE POUR L'ADOPTION APPROUVÉE
    // ============================================================

    @Override
    @Async
    public void sendAdoptionApprovedEmail(Contract contract) {
        if (contract.getAdoptant() == null ||
                contract.getAdoptant().getEmail() == null) return;

        String to         = contract.getAdoptant().getEmail();
        String firstName  = contract.getAdoptant().getFirstName();
        String animalName = contract.getAnimal() != null
                ? contract.getAnimal().getName() : "the animal";
        String shelterName = contract.getShelter() != null
                ? contract.getShelter().getName() : "the shelter";
        String contractNum = contract.getNumeroContrat();
        String date = contract.getDateAdoption() != null
                ? contract.getDateAdoption().format(DATE_FMT) : "today";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("🎉 Your adoption of " + animalName + " has been approved!");
            helper.setText(buildEmailHtml(firstName, animalName, shelterName, contractNum, date), true);
            mailSender.send(message);
            System.out.println("✅ Approval email sent to: " + to);
        } catch (MessagingException e) {
            System.err.println("⚠️ Failed to send email to " + to + ": " + e.getMessage());
        }
    }

    public void sendTravelPlanApprovedEmail(TravelPlan travelPlan) {
        String recipientEmail = resolveRecipientEmail(travelPlan);
        if (recipientEmail == null) {
            return;
        }

        String safeClientName   = escapeHtml(resolveClientName(travelPlan));
        String safePetName      = escapeHtml(resolvePetName(travelPlan.getPetId()));
        String safeDestination  = escapeHtml(resolveDestinationLabel(travelPlan.getDestination()));
        String safeTravelDate   = escapeHtml(travelPlan.getTravelDate() != null
                ? travelPlan.getTravelDate().format(TRAVEL_DATE_FMT)
                : "Not specified");

        String subject  = "Your Travel Plan Has Been Approved \u2713";
        String htmlBody = buildTravelPlanApprovedEmailHtml(
                safeClientName, travelPlan.getId(), safePetName, safeDestination, safeTravelDate);

        sendHtmlEmail(recipientEmail, subject, htmlBody);
    }

    public void sendTravelPlanRejectedEmail(TravelPlan travelPlan, String rejectionReason) {
        String recipientEmail = resolveRecipientEmail(travelPlan);
        if (recipientEmail == null) {
            return;
        }

        String safeClientName   = escapeHtml(resolveClientName(travelPlan));
        String safePetName      = escapeHtml(resolvePetName(travelPlan.getPetId()));
        String safeDestination  = escapeHtml(resolveDestinationLabel(travelPlan.getDestination()));
        String safeTravelDate   = escapeHtml(travelPlan.getTravelDate() != null
                ? travelPlan.getTravelDate().format(TRAVEL_DATE_FMT)
                : "Not specified");

        String subject  = "Update on Your Travel Plan Request";
        String htmlBody = buildTravelPlanRejectedEmailHtml(
                safeClientName, travelPlan.getId(), safePetName, safeDestination, safeTravelDate, rejectionReason);

        sendHtmlEmail(recipientEmail, subject, htmlBody);
    }

    // ============================================================
    // MÉTHODES PRIVÉES — RÉSOLUTION
    // ============================================================

    private String resolveRecipientEmail(TravelPlan travelPlan) {
        if (travelPlan == null || travelPlan.getOwner() == null) return null;
        String email = travelPlan.getOwner().getEmail();
        if (email == null || email.isBlank()) return null;
        return email.trim();
    }

    private String resolveClientName(TravelPlan travelPlan) {
        if (travelPlan == null || travelPlan.getOwner() == null) return "Client";
        String firstName = travelPlan.getOwner().getFirstName() != null
                ? travelPlan.getOwner().getFirstName().trim() : "";
        String lastName  = travelPlan.getOwner().getLastName() != null
                ? travelPlan.getOwner().getLastName().trim() : "";
        String fullName  = (firstName + " " + lastName).trim();
        return fullName.isBlank() ? "Client" : fullName;
    }

    private String resolvePetName(Long petId) {
        if (petId == null) return "Not specified";
        return petProfileRepository.findById(petId)
                .map(profile -> {
                    String name = profile.getName();
                    if (name == null || name.isBlank()) return "Pet #" + petId;
                    return name.trim();
                })
                .orElse("Pet #" + petId);
    }

    private String resolveDestinationLabel(TravelDestination destination) {
        if (destination == null) return "Not specified";
        String title   = destination.getTitle()   != null ? destination.getTitle().trim()   : "";
        String country = destination.getCountry() != null ? destination.getCountry().trim() : "";
        if (title.isBlank() && country.isBlank()) return "Not specified";
        if (title.isBlank())   return country;
        if (country.isBlank()) return title;
        return title + " (" + country + ")";
    }

    // ============================================================
    // CONSTRUCTEURS D'EMAIL HTML
    // ============================================================

    private String buildEmailHtml(String firstName, String animalName,
                                  String shelterName, String contractNum, String date) {
        return """
                <!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>
                  body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0}
                  .container{max-width:600px;margin:30px auto;background:white;border-radius:12px;
                    overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
                  .header{background:rgb(58,146,130);padding:30px;text-align:center}
                  .header h1{color:white;margin:0;font-size:24px}
                  .header p{color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px}
                  .body{padding:30px}
                  .body p{color:#4a5568;font-size:14px;line-height:1.6}
                  .info-box{background:#f0fff4;border-left:4px solid rgb(58,146,130);
                    border-radius:8px;padding:16px;margin:20px 0}
                  .info-box p{margin:4px 0;font-size:13px;color:#2d3748}
                  .info-box strong{color:rgb(58,146,130)}
                  .btn{display:inline-block;background:rgb(58,146,130);color:white;
                    padding:12px 28px;border-radius:8px;text-decoration:none;
                    font-weight:bold;font-size:14px;margin-top:20px}
                  .footer{background:#f4f6f8;padding:16px;text-align:center;
                    font-size:11px;color:#a0aec0}
                </style></head><body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 Congratulations, %s!</h1>
                    <p>Your adoption request has been approved</p>
                  </div>
                  <div class="body">
                    <p>Your adoption of <strong>%s</strong> has been approved by <strong>%s</strong>.</p>
                    <p>Your contract is ready to download in <strong>My Contracts</strong>.</p>
                    <div class="info-box">
                      <p><strong>Contract N° :</strong> %s</p>
                      <p><strong>Animal :</strong> %s</p>
                      <p><strong>Shelter :</strong> %s</p>
                      <p><strong>Date :</strong> %s</p>
                    </div>
                    <a href="http://localhost:4200/app/adoption/my-contracts" class="btn">
                      📄 View My Contracts
                    </a>
                  </div>
                  <div class="footer">This email was sent automatically.</div>
                </div></body></html>
                """.formatted(firstName, animalName, shelterName,
                contractNum, animalName, shelterName, date);
    }

    private String buildAdoptionApprovedEmailHtml(String firstName, String animalName,
                                                  String shelterName, String contractNum, String date) {
        String contractsUrl = frontendBaseUrl + "/app/adoption/my-contracts";
        return """
                <!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>
                  body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0}
                  .container{max-width:600px;margin:30px auto;background:white;border-radius:12px;
                    overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
                  .header{background:rgb(58,146,130);padding:30px;text-align:center}
                  .header h1{color:white;margin:0;font-size:24px}
                  .header p{color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px}
                  .body{padding:30px}
                  .body p{color:#4a5568;font-size:14px;line-height:1.6}
                  .info-box{background:#f0fff4;border-left:4px solid rgb(58,146,130);
                    border-radius:8px;padding:16px;margin:20px 0}
                  .info-box p{margin:4px 0;font-size:13px;color:#2d3748}
                  .info-box strong{color:rgb(58,146,130)}
                  .btn{display:inline-block;background:rgb(58,146,130);color:white;
                    padding:12px 28px;border-radius:8px;text-decoration:none;
                    font-weight:bold;font-size:14px;margin-top:20px}
                  .footer{background:#f4f6f8;padding:16px;text-align:center;
                    font-size:11px;color:#a0aec0}
                </style></head><body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 Congratulations, %s!</h1>
                    <p>Your adoption request has been approved</p>
                  </div>
                  <div class="body">
                    <p>Your adoption of <strong>%s</strong> has been approved by <strong>%s</strong>.</p>
                    <p>Your contract is ready to download in <strong>My Contracts</strong>.</p>
                    <div class="info-box">
                      <p><strong>Contract N° :</strong> %s</p>
                      <p><strong>Animal :</strong> %s</p>
                      <p><strong>Shelter :</strong> %s</p>
                      <p><strong>Date :</strong> %s</p>
                    </div>
                    <a href="%s" class="btn">
                      📄 View My Contracts
                    </a>
                  </div>
                  <div class="footer">This email was sent automatically.</div>
                </div></body></html>
                """.formatted(firstName, animalName, shelterName,
                contractNum, animalName, shelterName, date, contractsUrl);
    }

    private String buildTravelPlanApprovedEmailHtml(String clientName, Long travelPlanId,
                                                    String petName, String destination, String travelDate) {
        return """
                <!doctype html>
                <html>
                  <body style='margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;'>
                    <div style='max-width:640px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.10);'>
                      <div style='padding:24px 32px;background:#0f172a;color:#ffffff;'>
                        <p style='margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.92;'>PET TRANSIT \u00B7 SAFETY GUARDIAN</p>
                        <h1 style='margin:10px 0 0;font-size:24px;line-height:1.3;'>Travel Plan Status Update</h1>
                      </div>
                      <div style='padding:32px;'>
                        <div style='display:inline-block;padding:8px 14px;border-radius:999px;background:#dcfce7;color:#166534;font-weight:700;font-size:13px;'>&#10003; &nbsp; APPROVED</div>
                        <h2 style='margin:20px 0 12px;font-size:22px;color:#111827;'>Hello %s,</h2>
                        <p style='margin:0 0 16px;color:#374151;line-height:1.7;'>
                          Great news! Your travel plan has been carefully reviewed by our team and has been officially approved.
                          You are all set to begin preparing for your journey with your pet.
                        </p>
                        <div style='margin:20px 0;padding:18px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;'>
                          <p style='margin:0 0 10px;'><span style='color:#6b7280;font-size:13px;'>Plan reference</span><br><strong>#%d</strong></p>
                          <p style='margin:0 0 10px;'><span style='color:#6b7280;font-size:13px;'>Pet</span><br><strong>%s</strong></p>
                          <p style='margin:0 0 10px;'><span style='color:#6b7280;font-size:13px;'>Destination</span><br><strong>%s</strong></p>
                          <p style='margin:0;'><span style='color:#6b7280;font-size:13px;'>Travel date</span><br><strong>%s</strong></p>
                        </div>
                        <p style='color:#374151;line-height:1.7;margin:0;'>
                          Please ensure your required travel documents are complete and ready. If you have any questions,
                          do not hesitate to reach out to our support team.
                        </p>
                      </div>
                      <div style='padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;text-align:center;'>
                        This is an automated notification from Pet Transit \u00B7 Safety Guardian.<br>
                        Please do not reply to this email.
                      </div>
                    </div>
                  </body>
                </html>
                """.formatted(clientName, travelPlanId, petName, destination, travelDate);
    }

    private String buildTravelPlanRejectedEmailHtml(String clientName, Long travelPlanId,
                                                    String petName, String destination,
                                                    String travelDate, String rejectionReason) {
        String reasonBlock = buildRejectionReasonBlock(rejectionReason);
        return """
                <!doctype html>
                <html>
                  <body style='margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;'>
                    <div style='max-width:640px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.10);'>
                      <div style='padding:24px 32px;background:#0f172a;color:#ffffff;'>
                        <p style='margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.92;'>PET TRANSIT \u00B7 SAFETY GUARDIAN</p>
                        <h1 style='margin:10px 0 0;font-size:24px;line-height:1.3;'>Travel Plan Status Update</h1>
                      </div>
                      <div style='padding:32px;'>
                        <div style='display:inline-block;padding:8px 14px;border-radius:999px;background:#fef3c7;color:#92400e;font-weight:700;font-size:13px;'>&#10007; &nbsp; NOT APPROVED</div>
                        <h2 style='margin:20px 0 12px;font-size:22px;color:#111827;'>Hello %s,</h2>
                        <p style='margin:0 0 16px;color:#374151;line-height:1.7;'>
                          Thank you for submitting your travel plan. After careful review by our team, we regret to inform you
                          that your travel plan could not be approved at this stage.
                        </p>
                        %s
                        <p style='margin:0 0 16px;color:#374151;line-height:1.7;'>
                          We encourage you to review the details of your plan, address the points mentioned above, and resubmit
                          when ready. Our team is here to support you throughout the process.
                        </p>
                        <div style='margin:20px 0 0;padding:18px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;'>
                          <p style='margin:0 0 10px;'><span style='color:#6b7280;font-size:13px;'>Plan reference</span><br><strong>#%d</strong></p>
                          <p style='margin:0 0 10px;'><span style='color:#6b7280;font-size:13px;'>Pet</span><br><strong>%s</strong></p>
                          <p style='margin:0 0 10px;'><span style='color:#6b7280;font-size:13px;'>Destination</span><br><strong>%s</strong></p>
                          <p style='margin:0;'><span style='color:#6b7280;font-size:13px;'>Travel date</span><br><strong>%s</strong></p>
                        </div>
                      </div>
                      <div style='padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;text-align:center;'>
                        This is an automated notification from Pet Transit \u00B7 Safety Guardian.<br>
                        Please do not reply to this email.
                      </div>
                    </div>
                  </body>
                </html>
                """.formatted(clientName, reasonBlock, travelPlanId, petName, destination, travelDate);
    }

    private String buildRejectionReasonBlock(String rejectionReason) {
        String normalizedReason = rejectionReason == null ? "" : rejectionReason.trim();
        if (normalizedReason.isEmpty()) return "";
        return """
                <div style='margin:16px 0;padding:14px;border:1px solid #fcd34d;border-radius:10px;background:#fffbeb;'>
                  <p style='margin:0 0 6px;color:#92400e;font-weight:700;'>Reason provided by the admin:</p>
                  <p style='margin:0;color:#78350f;line-height:1.6;'>%s</p>
                </div>
                """.formatted(escapeHtml(normalizedReason));
    }

    private String escapeHtml(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
