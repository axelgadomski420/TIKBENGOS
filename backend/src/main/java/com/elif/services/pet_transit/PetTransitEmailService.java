package com.elif.services.pet_transit;

import com.elif.entities.pet_transit.TravelDestination;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.repositories.pet_profile.PetProfileRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Service
public class PetTransitEmailService {

  private final JavaMailSender mailSender;
  private final PetProfileRepository petProfileRepository;

  @Value("${app.mail.from:${spring.mail.username:}}")
  String fromEmail;

  private static final DateTimeFormatter TRAVEL_DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

  public PetTransitEmailService(JavaMailSender mailSender, PetProfileRepository petProfileRepository) {
    this.mailSender = mailSender;
    this.petProfileRepository = petProfileRepository;
  }

  public void sendApprovalEmail(TravelPlan travelPlan) {
    String recipientEmail = resolveRecipientEmail(travelPlan);
    if (recipientEmail == null) {
      return;
    }

    String safeClientFirstName = escapeHtml(resolveClientFirstName(travelPlan));
    String safeClientLastName = escapeHtml(resolveClientLastName(travelPlan));
    String safePetName = escapeHtml(resolvePetName(travelPlan.getPetId()));
    String safeDestinationName = escapeHtml(resolveDestinationName(travelPlan.getDestination()));
    String safeDestinationCountry = escapeHtml(resolveDestinationCountry(travelPlan.getDestination()));
    String safeTravelDate = escapeHtml(travelPlan.getTravelDate() != null
        ? travelPlan.getTravelDate().format(TRAVEL_DATE_FMT)
        : "Not specified");

    String subject = "Your Travel Plan Has Been Approved ✓";
    String htmlBody = buildTravelPlanApprovedEmailHtml(
        safeClientFirstName,
        safeClientLastName,
        safePetName,
        safeDestinationName,
        safeDestinationCountry,
        safeTravelDate
    );

    sendHtmlEmailWithInlineLogo(recipientEmail, subject, htmlBody);
  }

  public void sendRejectionEmail(TravelPlan travelPlan, String rejectionReason) {
    String recipientEmail = resolveRecipientEmail(travelPlan);
    if (recipientEmail == null) {
      return;
    }

    String safeClientFirstName = escapeHtml(resolveClientFirstName(travelPlan));
    String safeClientLastName = escapeHtml(resolveClientLastName(travelPlan));
    String safePetName = escapeHtml(resolvePetName(travelPlan.getPetId()));
    String safeDestinationName = escapeHtml(resolveDestinationName(travelPlan.getDestination()));
    String safeDestinationCountry = escapeHtml(resolveDestinationCountry(travelPlan.getDestination()));
    String safeTravelDate = escapeHtml(travelPlan.getTravelDate() != null
        ? travelPlan.getTravelDate().format(TRAVEL_DATE_FMT)
        : "Not specified");

    String subject = "Update on Your Travel Plan Request";
    String htmlBody = buildTravelPlanRejectedEmailHtml(
        safeClientFirstName,
        safeClientLastName,
        safePetName,
        safeDestinationName,
        safeDestinationCountry,
        safeTravelDate,
        rejectionReason
    );

    sendHtmlEmailWithInlineLogo(recipientEmail, subject, htmlBody);
  }

  private void sendHtmlEmailWithInlineLogo(String to, String subject, String htmlBody) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      if (fromEmail != null && !fromEmail.isBlank()) {
        helper.setFrom(Objects.requireNonNull(fromEmail));
      }
      helper.setTo(Objects.requireNonNull(to));
      helper.setSubject(Objects.requireNonNull(subject));
      helper.setText(Objects.requireNonNull(htmlBody), true);
      ClassPathResource logo = new ClassPathResource("static/images/logo-full-transparent.png");
      helper.addInline("appLogo", logo);
      mailSender.send(message);
    } catch (MessagingException e) {
      throw new RuntimeException("Failed to send email", e);
    }
  }

  private String resolveRecipientEmail(TravelPlan travelPlan) {
    if (travelPlan == null || travelPlan.getOwner() == null) {
      return null;
    }

    String email = travelPlan.getOwner().getEmail();
    if (email == null || email.isBlank()) {
      return null;
    }

    return email.trim();
  }

  private String resolveClientFirstName(TravelPlan travelPlan) {
    if (travelPlan == null || travelPlan.getOwner() == null) {
      return "Client";
    }
    String firstName = travelPlan.getOwner().getFirstName();
    return (firstName != null && !firstName.isBlank()) ? firstName.trim() : "Client";
  }

  private String resolveClientLastName(TravelPlan travelPlan) {
    if (travelPlan == null || travelPlan.getOwner() == null) {
      return "";
    }
    String lastName = travelPlan.getOwner().getLastName();
    return (lastName != null && !lastName.isBlank()) ? lastName.trim() : "";
  }

  private String resolvePetName(Long petId) {
    if (petId == null) {
      return "Not specified";
    }

    return petProfileRepository.findById(petId)
        .map(profile -> {
          String name = profile.getName();
          if (name == null || name.isBlank()) {
            return "Pet #" + petId;
          }
          return name.trim();
        })
        .orElse("Pet #" + petId);
  }

  private String resolveDestinationName(TravelDestination destination) {
    if (destination == null) return "Not specified";
    String title = destination.getTitle() != null ? destination.getTitle().trim() : "";
    return title.isBlank() ? "Not specified" : title;
  }

  private String resolveDestinationCountry(TravelDestination destination) {
    if (destination == null) return "";
    String country = destination.getCountry() != null ? destination.getCountry().trim() : "";
    return country;
  }

  private String buildTravelPlanApprovedEmailHtml(
      String clientFirstName,
      String clientLastName,
      String petName,
      String destinationName,
      String destinationCountry,
      String travelDate) {

    String ctaUrl = "http://localhost:4200/auth/login";
    String destinationLine = (destinationCountry != null && !destinationCountry.isBlank())
        ? destinationName + " (" + destinationCountry + ")"
        : destinationName;

    return """
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Travel Plan Approved</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table cellpadding="0" cellspacing="0" border="0" width="100%%" style="background-color:#f0f2f5;min-height:100vh;">
  <tr>
    <td align="center" valign="top" style="padding:32px 16px;">

      <!-- Email card -->
      <table cellpadding="0" cellspacing="0" border="0" width="600"
             style="max-width:600px;width:100%%;background-color:#ffffff;border-radius:12px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(10,20,40,0.10);">

        <!-- Header -->
        <tr>
          <td style="background-color:#0f1b2d;padding:32px 40px 28px;text-align:center;">
            <img src="cid:appLogo" alt="Elif · Pet Transit" width="160" height="auto"
                 style="display:block;margin:0 auto 20px;max-width:160px;height:auto;" />
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="background-color:#22c55e;border-radius:24px;padding:8px 20px;">
                  <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.06em;
                               text-transform:uppercase;white-space:nowrap;">&#10003;&nbsp;&nbsp;APPROVED</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">

            <!-- Greeting -->
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
              Hello %s %s,
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.7;">
              Your travel plan has been officially approved by our team.
              You are all set to begin preparing for your journey with <strong>%s</strong>.
            </p>

            <!-- Info card -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%%"
                   style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">

                  <table cellpadding="0" cellspacing="0" border="0" width="100%%">
                    <tr>
                      <td style="padding-bottom:16px;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:600;text-transform:uppercase;
                                   letter-spacing:0.08em;color:#94a3b8;">Pet</p>
                        <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">%s</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 0;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:600;text-transform:uppercase;
                                   letter-spacing:0.08em;color:#94a3b8;">Destination</p>
                        <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">%s</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:16px;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:600;text-transform:uppercase;
                                   letter-spacing:0.08em;color:#94a3b8;">Travel Date</p>
                        <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">%s</p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>

            <!-- Footer note -->
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.7;">
              Please ensure all required travel documents are complete and ready.
              Our support team is here if you need any assistance.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td align="center" style="border-radius:8px;" bgcolor="#16a34a">
                  <a href="%s" target="_blank"
                     style="display:inline-block;padding:14px 32px;background-color:#16a34a;color:#ffffff;
                            font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;
                            letter-spacing:0.02em;">View My Travel Plan</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;
                     padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              This is an automated notification from <strong>Elif &middot; Pet Transit</strong>.<br>
              Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>""".formatted(
        clientFirstName, clientLastName,
        petName,
        petName,
        destinationLine,
        travelDate,
        ctaUrl
    );
  }

  private String buildTravelPlanRejectedEmailHtml(
      String clientFirstName,
      String clientLastName,
      String petName,
      String destinationName,
      String destinationCountry,
      String travelDate,
      String rejectionReason) {

    String ctaUrl = "http://localhost:4200/auth/login";
    String reasonBlock = buildRejectionReasonBlock(rejectionReason);
    String destinationLine = (destinationCountry != null && !destinationCountry.isBlank())
        ? destinationName + " (" + destinationCountry + ")"
        : destinationName;

    return """
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Travel Plan Update</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table cellpadding="0" cellspacing="0" border="0" width="100%%" style="background-color:#f0f2f5;min-height:100vh;">
  <tr>
    <td align="center" valign="top" style="padding:32px 16px;">

      <!-- Email card -->
      <table cellpadding="0" cellspacing="0" border="0" width="600"
             style="max-width:600px;width:100%%;background-color:#ffffff;border-radius:12px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(10,20,40,0.10);">

        <!-- Header -->
        <tr>
          <td style="background-color:#0f1b2d;padding:32px 40px 28px;text-align:center;">
            <img src="cid:appLogo" alt="Elif · Pet Transit" width="160" height="auto"
                 style="display:block;margin:0 auto 20px;max-width:160px;height:auto;" />
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="background-color:#dc2626;border-radius:24px;padding:8px 20px;">
                  <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.06em;
                               text-transform:uppercase;white-space:nowrap;">&#10007;&nbsp;&nbsp;NOT APPROVED</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">

            <!-- Greeting -->
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
              Hello %s %s,
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
              After careful review, we were unable to approve your travel plan at this stage.
            </p>

            <!-- Rejection reason (conditional) -->
            %s

            <!-- Info card -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%%"
                   style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">

                  <table cellpadding="0" cellspacing="0" border="0" width="100%%">
                    <tr>
                      <td style="padding-bottom:16px;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:600;text-transform:uppercase;
                                   letter-spacing:0.08em;color:#94a3b8;">Pet</p>
                        <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">%s</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 0;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:600;text-transform:uppercase;
                                   letter-spacing:0.08em;color:#94a3b8;">Destination</p>
                        <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">%s</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:16px;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:600;text-transform:uppercase;
                                   letter-spacing:0.08em;color:#94a3b8;">Travel Date</p>
                        <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">%s</p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>

            <!-- Footer note -->
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.7;">
              We encourage you to address the points above and resubmit when ready.
              Our team is here to support you.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td align="center" style="border-radius:8px;" bgcolor="#1e293b">
                  <a href="%s" target="_blank"
                     style="display:inline-block;padding:14px 32px;background-color:#1e293b;color:#e2e8f0;
                            font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;
                            letter-spacing:0.02em;">Review My Plan</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;
                     padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              This is an automated notification from <strong>Elif &middot; Pet Transit</strong>.<br>
              Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>""".formatted(
        clientFirstName, clientLastName,
        reasonBlock,
        petName,
        destinationLine,
        travelDate,
        ctaUrl
    );
  }

  private String buildRejectionReasonBlock(String rejectionReason) {
    String normalizedReason = rejectionReason == null ? "" : rejectionReason.trim();
    if (normalizedReason.isEmpty()) {
      return "";
    }

    return """
        <table cellpadding="0" cellspacing="0" border="0" width="100%%"
               style="margin-bottom:24px;border-radius:8px;overflow:hidden;">
          <tr>
            <td width="4" style="background-color:#f97316;border-radius:4px 0 0 4px;">&nbsp;</td>
            <td style="background-color:#fff7ed;padding:16px 20px;border:1px solid #fed7aa;
                        border-left:none;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;
                          letter-spacing:0.08em;color:#c2410c;">Reason provided by the admin</p>
              <p style="margin:0;font-size:14px;color:#7c2d12;line-height:1.6;">%s</p>
            </td>
          </tr>
        </table>
        """.formatted(escapeHtml(normalizedReason));
  }

  private String escapeHtml(String value) {
    if (value == null) {
      return "";
    }

    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;");
  }
}
