package com.elif.services.events.implementations;

import com.elif.entities.events.Event;
import com.elif.entities.events.EventParticipant;
import com.elif.entities.user.User;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.*;
import com.itextpdf.io.image.ImageDataFactory;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventEmailService {

    private final JavaMailSender  mailSender;
    private final TemplateEngine  templateEngine;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    @Value("${app.backend.public-url:http://localhost:8087/elif}")
    private String backendPublicUrl;

    private static final DeviceRgb GREEN  = new DeviceRgb(29, 158, 117);
    private static final DeviceRgb ORANGE = new DeviceRgb(245, 158, 11);
    private static final DeviceRgb DARK   = new DeviceRgb(30, 41, 59);
    private static final DeviceRgb LIGHT  = new DeviceRgb(248, 250, 252);

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy 'at' h:mm a", Locale.ENGLISH);
    private static final DateTimeFormatter PDF_DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy - HH:mm");

    private String eventUrl(Long eventId) {
        return frontendBaseUrl + "/app/events/" + eventId;
    }

    private String waitlistConfirmationUrl(Long eventId) {
        return eventUrl(eventId) + "/waitlist/confirm";
    }

    private String eventsHomeUrl() {
        return frontendBaseUrl + "/app/events";
    }

    // ── QR Code ──────────────────────────────────────────────────────

    private byte[] generateQRCode(String data, int width, int height) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(data, BarcodeFormat.QR_CODE, width, height);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("QR code generation failed: {}", e.getMessage());
            return null;
        }
    }

    private String buildQrData(Event event, User user, EventParticipant participant) {
        String ticketCode = "TKT-" + event.getId() + "-" + user.getId() + "-" + participant.getId();
        String dateStr    = event.getStartDate() != null
                ? event.getStartDate().format(PDF_DATE_FMT) : "TBD";

        return String.format(
                "{\"e\":%d,\"p\":%d,\"u\":%d,\"c\":\"%s\",\"d\":\"%s\",\"t\":\"%s\"}",
                event.getId(),
                participant.getId(),
                user.getId(),
                ticketCode,
                dateStr,
                event.getTitle().replaceAll("\"", "'")
        );
    }

    // ── PDF Ticket ───────────────────────────────────────────────────

    public byte[] generateTicketPDF(Event event, User user, EventParticipant participant) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter pdfWriter = new PdfWriter(baos);
            PdfDocument pdfDoc  = new PdfDocument(pdfWriter);
            Document doc = new Document(pdfDoc, PageSize.A5.rotate());
            doc.setMargins(24, 24, 24, 24);

            Table headerBand = new Table(UnitValue.createPercentArray(new float[]{1}))
                    .setWidth(UnitValue.createPercentValue(100));
            Cell headerCell = new Cell()
                    .setBackgroundColor(GREEN)
                    .setPadding(14)
                    .setBorder(null);

            Paragraph brand = new Paragraph("🐾 ELIF  ·  Entry Ticket")
                    .setFontSize(18).setBold()
                    .setFontColor(new DeviceRgb(255, 255, 255))
                    .setTextAlignment(TextAlignment.CENTER);
            headerCell.add(brand);

            Paragraph eventNameInHeader = new Paragraph(event.getTitle())
                    .setFontSize(11)
                    .setFontColor(new DeviceRgb(220, 245, 235))
                    .setTextAlignment(TextAlignment.CENTER);
            headerCell.add(eventNameInHeader);
            headerBand.addCell(headerCell);
            doc.add(headerBand);

            doc.add(new Paragraph(" ").setMarginBottom(8));

            Table body = new Table(UnitValue.createPercentArray(new float[]{60, 40}))
                    .setWidth(UnitValue.createPercentValue(100));

            Cell infoCell = new Cell().setBorder(null).setPaddingRight(20);

            addInfoLine(infoCell, "Event",       event.getTitle());
            addInfoLine(infoCell, "Date",         event.getStartDate() != null
                    ? event.getStartDate().format(PDF_DATE_FMT) : "TBD");
            addInfoLine(infoCell, "Location",     event.getLocation() != null
                    ? event.getLocation() : "TBD");
            addInfoLine(infoCell, "Participant",
                    user.getFirstName() + " " + user.getLastName());
            addInfoLine(infoCell, "Seats",
                    String.valueOf(participant.getNumberOfSeats()));
            addInfoLine(infoCell, "Ticket code",
                    "TKT-" + event.getId() + "-" + user.getId() + "-" + participant.getId());

            body.addCell(infoCell);

            Cell qrCell = new Cell().setBorder(null)
                    .setTextAlignment(TextAlignment.CENTER);

            String qrData = buildQrData(event, user, participant);
            byte[] qrBytes = generateQRCode(qrData, 200, 200);

            if (qrBytes != null) {
                Image qrImg = new Image(ImageDataFactory.create(qrBytes))
                        .setWidth(130).setHeight(130)
                        .setHorizontalAlignment(HorizontalAlignment.CENTER);
                qrCell.add(qrImg);
            } else {
                qrCell.add(new Paragraph("[QR unavailable]")
                        .setFontColor(ORANGE).setFontSize(9));
            }

            qrCell.add(new Paragraph("Scan at entrance")
                    .setFontSize(9).setFontColor(DARK)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginTop(6));

            qrCell.add(new Paragraph("Valid for 1 entry")
                    .setFontSize(8).setFontColor(new DeviceRgb(148, 163, 184))
                    .setTextAlignment(TextAlignment.CENTER));

            body.addCell(qrCell);
            doc.add(body);

            doc.add(new Paragraph(" ").setMarginTop(10));
            Paragraph footer = new Paragraph(
                    "ELIF Pet Events Platform  ·  This ticket is non-transferable  ·  "
                            + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setFontSize(7)
                    .setFontColor(new DeviceRgb(148, 163, 184))
                    .setTextAlignment(TextAlignment.CENTER);
            doc.add(footer);

            doc.close();
            log.info("✅ PDF ticket generated: {} bytes for user {} event {}",
                    baos.size(), user.getId(), event.getId());
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("❌ PDF generation failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate ticket PDF", e);
        }
    }

    private void addInfoLine(Cell cell, String label, String value) {
        Table row = new Table(UnitValue.createPercentArray(new float[]{35, 65}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(5);
        row.addCell(new Cell()
                .add(new Paragraph(label).setFontSize(9).setFontColor(new DeviceRgb(100, 116, 139)).setBold())
                .setBorder(null).setPadding(2));
        row.addCell(new Cell()
                .add(new Paragraph(value != null ? value : "—").setFontSize(9).setFontColor(DARK))
                .setBorder(null).setPadding(2));
        cell.add(row);
    }

    // ── Email Ticket ────────────────────────────────────────────────

    @Async
    public void sendTicketWithPdf(String toEmail, String firstName,
                                  String eventTitle, Long eventId, byte[] pdfBytes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("🎫 Your ticket for " + eventTitle);

            String html = buildTicketEmailHtml(firstName, eventTitle, eventId);
            helper.setText(html, true);
            helper.addAttachment(
                    "ticket_" + eventTitle.replaceAll("[^a-zA-Z0-9]", "_") + ".pdf",
                    new ByteArrayResource(pdfBytes)
            );
            mailSender.send(message);
            log.info("📧 Ticket email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send ticket email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildTicketEmailHtml(String firstName, String eventTitle, Long eventId) {
        return """
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"/></head>
        <body style="font-family:sans-serif;background:#f0f0f0;margin:0;padding:20px;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1)">
            <div style="background:#1d9e75;padding:24px;text-align:center">
              <div style="font-size:28px;font-weight:800;color:#fff">🐾 ELIF</div>
              <div style="font-size:14px;color:#e0f2e9;margin-top:8px">Pet Events Platform</div>
            </div>
            <div style="padding:32px">
              <h2 style="color:#1e293b;margin:0 0 16px">✅ Registration Confirmed!</h2>
              <p style="color:#334155;line-height:1.6;margin:0 0 20px">
                Hi <strong>%s</strong>,<br>
                Your registration for <strong>%s</strong> is confirmed.
                Your ticket is attached to this email — present the QR code at the entrance.
              </p>
              <div style="background:#f0fdf4;border-left:4px solid #1d9e75;border-radius:8px;padding:16px;margin:20px 0">
                <p style="margin:0 0 6px"><strong>📎 Your ticket (PDF) is attached</strong></p>
                <p style="margin:0;font-size:13px;color:#64748b">
                  The QR code is scanned at the entrance — no internet required for verification.
                </p>
              </div>
              <div style="text-align:center;margin:24px 0">
                <a href="%s" style="display:inline-block;padding:12px 32px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
                  View Event Details
                </a>
              </div>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                © ELIF — Do not reply to this email.
              </p>
            </div>
          </div>
        </body></html>
        """.formatted(firstName, eventTitle, eventUrl(eventId));
    }

    // ── Email Certificat ────────────────────────────────────────────

    // ══════════════════════════════════════════════════════════════
    // MÉTHODE À REMPLACER dans EventEmailService.java
    // Remplace la méthode sendAttendanceResultEmail existante
    // ══════════════════════════════════════════════════════════════

    @Async
    public void sendAttendanceResultEmail(String toEmail, String userName,
                                          String eventTitle,
                                          double attendancePct,
                                          int    thresholdPct,
                                          boolean certificateEarned,
                                          String  certificateUrl) {
        String subject = certificateEarned
                ? "Your certificate is ready | " + eventTitle
                : "Attendance results | " + eventTitle;

        String absoluteUrl = (certificateUrl != null && certificateUrl.startsWith("http"))
                ? certificateUrl
                : backendPublicUrl + "/api" + certificateUrl;

        double safeAttendance = Math.max(0.0, Math.min(attendancePct, 100.0));
        double barPct = safeAttendance;
        String barColor = certificateEarned ? "#1a6b45" : (attendancePct >= 50 ? "#f5720a" : "#d94040");
        String certSection = certificateEarned
                ? buildCertEarnedSection(absoluteUrl, userName, safeAttendance, thresholdPct)
                : buildCertNotEarnedSection(safeAttendance, thresholdPct);

        String html = buildAttendanceEmailHtml(
                userName, eventTitle, safeAttendance, thresholdPct,
                barPct, barColor, certSection, certificateEarned);

        send(toEmail, subject, html);
    }

    private String buildCertEarnedSection(String certUrl, String userName, double pct, int threshold) {
        return String.format("""
        <div style="margin: 28px 0;">
          <div style="background: linear-gradient(135deg, #173a4c, #1a6b45);
                      border-radius: 22px; padding: 30px; text-align: center;
                      margin-bottom: 18px;">
            <div style="font-size: 42px; margin-bottom: 10px;">🏆</div>
            <h2 style="color: #ffffff; font-size: 1.45rem; margin: 0 0 8px;
                       font-family: Georgia, serif;">Certificate available</h2>
            <p style="color: rgba(255,255,255,0.82); margin: 0; font-size: 0.94rem; line-height: 1.7;">
              Your verified attendance reached <strong style="color:#ffffff;">%.1f%%</strong>,
              above the required <strong style="color:#ffffff;">%d%%</strong>.
            </p>
          </div>

          <div style="border: 1px solid rgba(26,107,69,0.16); border-radius: 22px; overflow: hidden;
                      margin-bottom: 18px; background: #ffffff;">
            <div style="background: #f6fbf8; padding: 18px 22px; border-bottom: 1px solid rgba(26,107,69,0.12);">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                <div>
                  <div style="color:#1a6b45; font-size:0.78rem; text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">
                    ELIF Events
                  </div>
                  <div style="color:#173a4c; font-size:1.1rem; font-weight:800; margin-top:4px;">
                    Certificate preview
                  </div>
                </div>
                <div style="padding:7px 12px; border-radius:999px; background:#eef7f3; color:#1a6b45; font-size:0.76rem; font-weight:700;">
                  Verified completion
                </div>
              </div>
            </div>
            <div style="padding: 28px 24px; text-align: center;">
              <p style="font-size: 0.78rem; color: #6b7e72; margin: 0 0 8px; text-transform:uppercase; letter-spacing:0.12em;">
                Awarded to
              </p>
              <div style="font-family: Georgia, serif; font-size: 2rem; color: #173a4c;
                          font-weight: bold; margin-bottom: 8px;">
                %s
              </div>
              <p style="font-size: 0.9rem; color: #6b7e72; margin: 0 0 14px; line-height: 1.7;">
                The participant completed the session with <strong style="color:#1a6b45;">%.1f%% attendance</strong>.
              </p>
              <div style="display: inline-block; background: #fff7eb; border: 1px solid #f0c98c;
                          border-radius: 999px; padding: 9px 16px; font-size: 0.82rem; color: #915d0b; font-weight:700;">
                Attendance threshold met: %d%% required
              </div>
            </div>
          </div>
          <div style="text-align: center;">
            <a href="%s" target="_blank"
               style="display: inline-block; background: #f5720a; color: #ffffff;
                      padding: 14px 30px; border-radius: 999px; text-decoration: none;
                      font-weight: 700; font-size: 0.95rem;
                      box-shadow: 0 10px 24px rgba(245,114,10,0.24);">
              View and download certificate
            </a>
          </div>
          <p style="text-align: center; font-size: 0.76rem; color: #6b7e72; margin-top: 12px; line-height: 1.6;">
            The certificate opens in your browser and can be printed or saved as a PDF copy.
          </p>
        </div>
        """, pct, threshold, userName, pct, threshold, certUrl);
    }

    private String buildCertNotEarnedSection(double pct, int threshold) {
        return String.format("""
        <div style="background: #fff7f7; border: 1.5px solid #fecaca; border-radius: 18px;
                    padding: 22px; margin: 22px 0; text-align: center;">
          <div style="font-size: 34px; margin-bottom: 8px;">❌</div>
          <h3 style="color: #991b1b; margin: 0 0 8px; font-size: 1rem;">
            Certificate not issued
          </h3>
          <p style="color: #7f1d1d; margin: 0; font-size: 0.9rem; line-height: 1.7;">
            Verified attendance was <strong>%.1f%%</strong>, while the event required
            <strong>%d%%</strong> for certification.
          </p>
        </div>
        <div style="background: #f7fbf8; border: 1px solid #d6ede2; border-radius: 16px;
                    padding: 16px 18px; font-size: 0.84rem; color: #1a6b45; margin-top: 10px; line-height: 1.7;">
          Future sessions are evaluated independently, so full attendance at a later event can still earn a certificate.
        </div>
        """, pct, threshold);
    }

    private String buildAttendanceEmailHtml(
            String userName, String eventTitle,
            double attendancePct, int thresholdPct,
            double barPct, String barColor,
            String certSection, boolean earned) {

        String headerEmoji = earned ? "🏆" : "📊";
        String headerTitle = earned ? "Session complete | certificate ready" : "Session attendance results";
        String headerBg = earned
                ? "linear-gradient(135deg, #173a4c 0%, #1a6b45 100%)"
                : "linear-gradient(135deg, #173a4c 0%, #4b5563 100%)";

        return String.format("""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>%s — %s</title>
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #edf2ec;
                     margin: 0; padding: 32px 16px; color: #1d2a38;">

          <div style="max-width: 580px; margin: 0 auto;">

            <div style="background: %s; border-radius: 28px 28px 0 0; padding: 36px 32px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 12px;">%s</div>
              <h1 style="color: #ffffff; font-size: 1.4rem; margin: 0 0 8px; font-weight: 700;">
                %s
              </h1>
              <p style="color: rgba(255,255,255,.78); margin: 0; font-size: 0.92rem; line-height: 1.6;">
                %s
              </p>
            </div>
            <div style="height: 4px; background: linear-gradient(90deg, #f5720a, #c9a227, #f5720a);"></div>
            <div style="background: #ffffff; border-radius: 0 0 28px 28px; padding: 32px; box-shadow: 0 20px 44px rgba(23,58,76,0.12);">

              <p style="color: #0f1f16; margin: 0 0 8px;">
                Hi <strong>%s</strong>,
              </p>
              <p style="color: #607182; line-height: 1.72; margin: 0 0 24px; font-size: 0.95rem;">
                Here is the verified attendance summary for the virtual session of
                <strong style="color: #0f1f16;">%s</strong>.
              </p>

              <div style="background: #f7fbf8; border-radius: 18px; padding: 22px; margin-bottom: 24px;
                          border: 1px solid #dce8e2;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;
                            align-items: center;">
                  <span style="font-size: 0.82rem; color: #607182; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Attendance</span>
                  <strong style="font-size: 1.5rem; color: #0f1f16;">%.1f%%</strong>
                </div>
                <div style="height: 10px; background: #d6ede2; border-radius: 999px; overflow: hidden;">
                  <div style="height: 100%%; width: %.1f%%; background: %s; border-radius: 999px;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 8px;
                            font-size: 0.75rem;">
                  <span style="color: #607182;">0%%</span>
                  <span style="color: #607182;">Required: %d%%</span>
                  <span style="color: #607182;">100%%</span>
                </div>
              </div>
              %s

            </div>
            <div style="text-align: center; padding: 18px; color: #607182; font-size: 0.76rem;">
              ELIF Events · Automated message, please do not reply
            </div>

          </div>
        </body>
        </html>
        """,
                headerTitle, eventTitle,
                headerBg,
                headerEmoji,
                headerTitle,
                eventTitle,
                userName,
                eventTitle,
                attendancePct,
                barPct, barColor,
                thresholdPct,
                certSection
        );
    }

    @Async
    public void sendAbsenceEmail(String toEmail, String userName, String eventTitle) {
        String html = String.format("""
        <!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
        <body style="font-family:sans-serif;background:#f1f5f9;margin:0;padding:20px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
            <div style="background:#fef3c7;padding:24px;text-align:center">
              <div style="font-size:48px">😔</div>
              <h2 style="color:#92400e">You missed the session</h2>
            </div>
            <div style="padding:28px">
              <p>Hi <strong>%s</strong>,</p>
              <p style="color:#475569">We noticed you did not join the virtual session for <strong>%s</strong>.</p>
              <p style="color:#475569">No certificate was issued. If you believe this is an error, please contact the organizer.</p>
            </div>
          </div>
        </body></html>
        """, userName, eventTitle);
        send(toEmail, "⚠️ You missed the session — " + eventTitle, html);
    }

    // ── Emails Inscription / Waitlist ───────────────────────────────

    @Async
    public void sendRegistrationConfirmedWithTicket(String toEmail, String firstName,
                                                    Event event, User user, EventParticipant participant) {
        try {
            byte[] pdfBytes = generateTicketPDF(event, user, participant);
            sendTicketWithPdf(toEmail, firstName, event.getTitle(), event.getId(), pdfBytes);
        } catch (Exception e) {
            log.error("Failed to generate ticket, fallback to simple email: {}", e.getMessage());
            sendRegistrationConfirmed(toEmail, firstName, event.getTitle(),
                    event.getId(), event.getLocation(), event.getStartDate());
        }
    }

    @Async
    public void sendRegistrationConfirmed(String toEmail, String firstName,
                                          String eventTitle, Long eventId, String eventLocation, LocalDateTime startDate) {
        send(toEmail, "✅ Registration confirmed: " + eventTitle,
                buildSimpleHtml(firstName,
                        "✅ Registration Confirmed!",
                        "You are registered for <strong>" + eventTitle + "</strong>.",
                        "📅 " + (startDate != null ? startDate.format(DATE_FMT) : "") +
                                "<br>📍 " + (eventLocation != null ? eventLocation : ""),
                        eventUrl(eventId),
                        "View Event"));
    }

    @Async
    public void sendRegistrationPending(String toEmail, String firstName, String eventTitle) {
        send(toEmail, "⏳ Registration received: " + eventTitle,
                buildSimpleHtml(firstName, "⏳ Registration Received",
                        "Your registration for <strong>" + eventTitle + "</strong> is pending admin approval.",
                        "You will be notified once reviewed.",
                        eventsHomeUrl(), "Browse events"));
    }

    @Async
    public void sendRegistrationApproved(String toEmail, String firstName,
                                         String eventTitle, Long eventId) {
        send(toEmail, "🎉 Approved: " + eventTitle,
                buildSimpleHtml(firstName, "🎉 Registration Approved!",
                        "Your registration for <strong>" + eventTitle + "</strong> has been approved.",
                        "", eventUrl(eventId), "View Event"));
    }

    @Async
    public void sendRegistrationRejected(String toEmail, String firstName, String eventTitle) {
        send(toEmail, "❌ Registration update: " + eventTitle,
                buildSimpleHtml(firstName, "Registration Not Approved",
                        "Unfortunately, your registration for <strong>" + eventTitle + "</strong> was not approved.",
                        "", eventsHomeUrl(), "Browse other events"));
    }

    @Async
    public void sendRegistrationCancelled(String toEmail, String firstName, String eventTitle) {
        send(toEmail, "🗑️ Registration cancelled: " + eventTitle,
                buildSimpleHtml(firstName, "Registration Cancelled",
                        "Your registration for <strong>" + eventTitle + "</strong> has been cancelled.",
                        "", eventsHomeUrl(), "Browse other events"));
    }

    @Async
    public void sendWaitlistOffer(String toEmail, String firstName, String eventTitle,
                                  Long eventId, Long waitlistEntryId, int deadlineHours) {
        send(toEmail, "🎟️ Spot available — " + eventTitle,
                buildSimpleHtml(firstName, "🎟️ A Spot is Available!",
                        "A spot has opened up for <strong>" + eventTitle + "</strong>.",
                        "⏰ You have <strong>" + deadlineHours + " hour(s)</strong> to confirm.",
                        waitlistConfirmationUrl(eventId),
                        "Confirm My Spot"));
    }

    @Async
    public void sendWaitlistExpired(String toEmail, String firstName, String eventTitle) {
        send(toEmail, "⏰ Confirmation expired: " + eventTitle,
                buildSimpleHtml(firstName, "Offer Expired",
                        "The confirmation deadline for <strong>" + eventTitle + "</strong> has passed.",
                        "", eventsHomeUrl(), "Browse other events"));
    }

    @Async
    public void sendEventReminder(String toEmail, String firstName, String eventTitle,
                                  Long eventId, String location, LocalDateTime startDate, String reminderLabel) {
        send(toEmail, "🔔 Reminder: " + eventTitle + " — " + reminderLabel,
                buildSimpleHtml(firstName, "🔔 Event Reminder",
                        "This is a reminder for <strong>" + eventTitle + "</strong>.",
                        "📅 " + (startDate != null ? startDate.format(DATE_FMT) : "") +
                                "<br>📍 " + (location != null ? location : "") +
                                "<br>⏰ " + reminderLabel,
                        eventUrl(eventId), "View Event"));
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private String buildSimpleHtml(String firstName, String title, String body,
                                   String details, String ctaUrl, String ctaLabel) {
        String detailsHtml = details.isBlank() ? "" :
                "<p style=\"color:#607182;font-size:13px;background:#f8fafc;padding:14px 16px;border-radius:14px;line-height:1.7\">" + details + "</p>";

        return String.format("""
        <!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
        <body style="font-family:'Segoe UI',Arial,sans-serif;background:#eef3f1;margin:0;padding:24px">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;
                      box-shadow:0 20px 48px rgba(23,58,76,.12)">
            <div style="background:linear-gradient(135deg,#173a4c,#1a6b45);padding:28px;text-align:center">
              <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:.06em">ELIF EVENTS</div>
            </div>
            <div style="padding:32px">
              <h2 style="color:#1d2a38;margin:0 0 14px;font-size:1.45rem">%s</h2>
              <p style="color:#425466;line-height:1.72;margin:0 0 18px">Hi <strong>%s</strong>,<br>%s</p>
              %s
              <div style="text-align:center;margin:24px 0 8px">
                <a href="%s" style="display:inline-block;padding:12px 28px;background:#f5720a;
                   color:#fff;text-decoration:none;border-radius:999px;font-weight:700">%s</a>
              </div>
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:20px 0 0">ELIF Events · Do not reply to this email.</p>
            </div>
          </div>
        </body></html>
        """, title, firstName, body, detailsHtml, ctaUrl, ctaLabel);
    }

    private void send(String to, String subject, String htmlBody) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("📧 Email sent to {} — '{}'", to, subject);
        } catch (Exception e) {
            log.error("❌ Email failed to {}: {}", to, e.getMessage());
        }
    }

    @Async
    public void sendHtmlEmail(String to, String subject, String htmlBody) {
        send(to, subject, htmlBody);
    }
}
