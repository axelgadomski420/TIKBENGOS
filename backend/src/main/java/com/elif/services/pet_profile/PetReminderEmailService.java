package com.elif.services.pet_profile;

import com.elif.entities.pet_profile.PetCareTask;
import com.elif.entities.pet_profile.PetHealthRecord;
import com.elif.entities.pet_profile.PetProfile;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class PetReminderEmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:${spring.mail.username:}}")
    private String fromEmail;

    @Value("${app.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    @Async
    public void sendVaccineReminder(PetProfile pet, PetHealthRecord record) {
        if (pet == null || pet.getUser() == null || isBlank(pet.getUser().getEmail()) || record == null || record.getNextVisitDate() == null) {
            return;
        }

        String subject = "💉 Vaccine reminder for " + pet.getName();
        String body = "Your next visit is scheduled for " + record.getNextVisitDate() + ".";
        sendReminderEmail(pet.getUser().getEmail(), subject, pet.getName(), body,
                "Open pet profile", petProfileUrl(pet.getId()));
    }

    @Async
    public void sendHealthCheckupReminder(PetProfile pet, PetHealthRecord latestRecord) {
        if (pet == null || pet.getUser() == null || isBlank(pet.getUser().getEmail())) {
            return;
        }

        String subject = "🏥 Health checkup reminder for " + pet.getName();
        String body = latestRecord == null
                ? "No health record is saved yet. Schedule a veterinary checkup to keep the profile up to date."
                : "It has been a while since the last checkup. Please schedule an appointment to review health history.";
        sendReminderEmail(pet.getUser().getEmail(), subject, pet.getName(), body,
                "Open pet profile", petProfileUrl(pet.getId()));
    }

    @Async
    public void sendParasitePreventionReminder(PetProfile pet, PetHealthRecord record, LocalDate nextPreventionDate) {
        if (pet == null || pet.getUser() == null || isBlank(pet.getUser().getEmail()) || record == null) {
            return;
        }

        String subject = "🐛 Parasite prevention due for " + pet.getName();
        String body = "The next parasite prevention date is " + nextPreventionDate + ". Last treatment was recorded on " + record.getRecordDate() + ".";
        sendReminderEmail(pet.getUser().getEmail(), subject, pet.getName(), body,
                "Open pet profile", petProfileUrl(pet.getId()));
    }

    @Async
    public void sendCareTaskReminder(PetProfile pet, PetCareTask task, long daysUntilDue) {
        if (pet == null || pet.getUser() == null || isBlank(pet.getUser().getEmail()) || task == null) {
            return;
        }

        String subject = "🦴 Care task reminder: " + task.getTitle();
        String body = String.format(
                "%s for %s is due in %d day%s. Priority: %s.",
                task.getTitle(),
                pet.getName(),
                daysUntilDue,
                daysUntilDue == 1 ? "" : "s",
                task.getUrgency()
        );
        sendReminderEmail(pet.getUser().getEmail(), subject, pet.getName(), body,
                "Open pet profile", petProfileUrl(pet.getId()));
    }

    @Async
    public void sendHealthUpdate(PetProfile pet, PetHealthRecord record) {
        if (pet == null || pet.getUser() == null || isBlank(pet.getUser().getEmail()) || record == null) {
            return;
        }

        String subject = "🩺 Health record saved for " + pet.getName();
        String body = "The health record was saved successfully. If you added vaccination information, the next reminders will be tracked from this record.";
        sendReminderEmail(pet.getUser().getEmail(), subject, pet.getName(), body,
                "Open pet profile", petProfileUrl(pet.getId()));
    }

    private void sendReminderEmail(String toEmail, String subject, String petName, String message, String ctaLabel, String ctaUrl) {
        if (isBlank(fromEmail)) {
            log.warn("Skipping pet reminder email because app.mail.from is empty");
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(buildHtml(petName, message, ctaLabel, ctaUrl), true);
            mailSender.send(mimeMessage);
            log.info("Pet reminder email sent to {} with subject {}", toEmail, subject);
        } catch (Exception ex) {
            log.error("Failed to send pet reminder email to {}", toEmail, ex);
        }
    }

    private String buildHtml(String petName, String message, String ctaLabel, String ctaUrl) {
        String safePetName = escapeHtml(petName);
        String safeMessage = escapeHtml(message);
        String safeCtaLabel = escapeHtml(ctaLabel);
        String safeCtaUrl = escapeHtml(ctaUrl);

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Pet reminder</title>
                </head>
                <body style="margin:0;padding:0;background:#f6fbfa;font-family:Arial,Helvetica,sans-serif;">
                <div style="display:none;max-height:0;overflow:hidden;">Pet care reminder from Elif.</div>
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#f6fbfa;padding:32px 16px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe9e6;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,0.12);">
                                <tr>
                                    <td style="padding:28px 28px 16px 28px;background:linear-gradient(180deg,#effaf7 0%,#ffffff 100%);">
                                        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e;font-weight:700;margin-bottom:10px;">Pet reminder</div>
                                        <h1 style="margin:0;color:#10212b;font-size:28px;line-height:1.2;">Reminder for %s</h1>
                                        <p style="margin:12px 0 0 0;color:#4b5563;font-size:15px;line-height:1.7;">%s</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:0 28px 28px 28px;">
                                        <div style="background:#f8fafc;border:1px solid #e5eef1;border-radius:14px;padding:16px 18px;color:#334155;font-size:14px;line-height:1.7;">
                                            <strong style="color:#0f172a;">%s</strong><br>
                                            %s
                                        </div>
                                        <div style="text-align:center;margin-top:24px;">
                                            <a href="%s" style="display:inline-block;background:#1f8a78;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">%s</a>
                                        </div>
                                        <p style="margin:20px 0 0 0;text-align:center;color:#64748b;font-size:12px;line-height:1.6;">This email was sent automatically by Elif. Please do not reply.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                </body>
                </html>
                """.formatted(safePetName, safeMessage, safePetName, safeMessage, safeCtaUrl, safeCtaLabel);
    }

    private String petProfileUrl(Long petId) {
        String baseUrl = frontendBaseUrl == null ? "" : frontendBaseUrl.trim();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl + "/app/pets/" + petId;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}