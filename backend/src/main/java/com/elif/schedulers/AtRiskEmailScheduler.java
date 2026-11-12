package com.elif.schedulers;

import com.elif.dto.adoption.response.AtRiskPetDTO;
import com.elif.entities.adoption.Shelter;
import com.elif.repositories.adoption.ShelterRepository;
import com.elif.services.adoption.impl.AtRiskPetScoringService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Envoi automatique chaque lundi à 9h00 d'un rapport
 * "At-Risk Animals" à chaque shelter concerné.
 *
 * ⚠️ Nécessite @EnableScheduling sur la classe principale Spring Boot.
 */
@Component
public class AtRiskEmailScheduler {

    private final AtRiskPetScoringService scoringService;
    private final ShelterRepository shelterRepository;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public AtRiskEmailScheduler(AtRiskPetScoringService scoringService,
                                ShelterRepository shelterRepository,
                                JavaMailSender mailSender) {
        this.scoringService    = scoringService;
        this.shelterRepository = shelterRepository;
        this.mailSender        = mailSender;
    }

    /**
     * Exécuté chaque lundi à 9h00.
     * Cron : seconde minute heure jour mois jour-semaine
     * 1 = lundi dans Spring (0 = dimanche)
     */
    @Scheduled(cron = "0 0 9 * * MON")
    public void sendWeeklyAtRiskReport() {
        System.out.println("📧 [AtRisk Scheduler] Running weekly at-risk report...");
        List<Shelter> shelters = shelterRepository.findAll();

        for (Shelter shelter : shelters) {
            if (shelter.getEmail() == null || shelter.getEmail().isBlank()) continue;

            List<AtRiskPetDTO> atRisk = scoringService.analyzeByShelterId(shelter.getId())
                    .stream()
                    .filter(d -> !"SAFE".equals(d.getRiskLevel()))
                    .collect(Collectors.toList());

            if (atRisk.isEmpty()) continue; // Pas d'animaux à risque → pas d'email

            try {
                sendReportEmail(shelter.getEmail(), shelter.getName(), atRisk);
                System.out.println("✅ At-risk report sent to: " + shelter.getEmail());
            } catch (Exception e) {
                System.err.println("⚠️ Failed to send report to " + shelter.getEmail()
                        + ": " + e.getMessage());
            }
        }
    }

    private void sendReportEmail(String to, String shelterName,
                                 List<AtRiskPetDTO> atRisk) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject("🔴 Weekly At-Risk Animals Report — " + shelterName);
        helper.setText(buildEmailHtml(shelterName, atRisk), true);
        mailSender.send(message);
    }

    private String buildEmailHtml(String shelterName, List<AtRiskPetDTO> pets) {
        long critical = pets.stream().filter(p -> "CRITICAL".equals(p.getRiskLevel())).count();
        long atRisk   = pets.stream().filter(p -> "AT_RISK".equals(p.getRiskLevel())).count();
        long watch    = pets.stream().filter(p -> "WATCH".equals(p.getRiskLevel())).count();

        StringBuilder rows = new StringBuilder();
        for (AtRiskPetDTO pet : pets) {
            String badge = switch (pet.getRiskLevel()) {
                case "CRITICAL" -> "<span style='background:#fff5f5;color:#e53e3e;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700'>🔴 Critical</span>";
                case "AT_RISK"  -> "<span style='background:#fffaf0;color:#ed8936;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700'>🟠 At Risk</span>";
                default         -> "<span style='background:#fffff0;color:#d69e2e;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700'>🟡 Watch</span>";
            };

            String recs = pet.getRecommendations() != null
                    ? pet.getRecommendations().stream()
                    .limit(2)
                    .map(r -> "<li style='margin:3px 0;font-size:12px;color:#4a5568'>" + r + "</li>")
                    .collect(Collectors.joining())
                    : "";

            rows.append("""
                    <tr style='border-bottom:1px solid #e2e8f0'>
                      <td style='padding:12px 8px;font-weight:600;color:#1a202c'>%s</td>
                      <td style='padding:12px 8px;color:#4a5568'>%s</td>
                      <td style='padding:12px 8px;text-align:center'>%d days</td>
                      <td style='padding:12px 8px;text-align:center'>%d</td>
                      <td style='padding:12px 8px;text-align:center'>%d / 100</td>
                      <td style='padding:12px 8px'>%s</td>
                      <td style='padding:12px 8px'><ul style='margin:0;padding-left:14px'>%s</ul></td>
                    </tr>
                    """.formatted(
                    pet.getPetName(),
                    pet.getPetType() != null ? pet.getPetType() : "—",
                    pet.getDaysInShelter(),
                    pet.getRequestCount(),
                    pet.getRiskScore(),
                    badge,
                    recs
            ));
        }

        return """
                <!DOCTYPE html><html><head><meta charset="UTF-8"></head><body
                  style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:20px">
                <div style="max-width:800px;margin:0 auto;background:white;border-radius:12px;
                            overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)">
                  <!-- Header -->
                  <div style="background:linear-gradient(135deg,rgb(58,146,130),rgb(40,110,100));
                              padding:28px;text-align:center">
                    <h1 style="color:white;margin:0;font-size:20px">🔴 Weekly At-Risk Animals Report</h1>
                    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:13px">%s</p>
                  </div>

                  <!-- Summary -->
                  <div style="padding:20px 28px;background:#fafbfc;border-bottom:1px solid #e2e8f0">
                    <p style="margin:0 0 12px;font-size:14px;color:#4a5568">
                      Your shelter has <strong>%d animals</strong> that need attention this week:
                    </p>
                    <div style="display:flex;gap:12px;flex-wrap:wrap">
                      <span style="background:#fff5f5;color:#e53e3e;padding:6px 14px;border-radius:8px;
                                   font-size:13px;font-weight:700">🔴 Critical: %d</span>
                      <span style="background:#fffaf0;color:#ed8936;padding:6px 14px;border-radius:8px;
                                   font-size:13px;font-weight:700">🟠 At Risk: %d</span>
                      <span style="background:#fffff0;color:#d69e2e;padding:6px 14px;border-radius:8px;
                                   font-size:13px;font-weight:700">🟡 Watch: %d</span>
                    </div>
                  </div>

                  <!-- Table -->
                  <div style="padding:20px 28px;overflow-x:auto">
                    <table style="width:100%%;border-collapse:collapse;font-size:13px">
                      <thead>
                        <tr style="background:#f4f6f8">
                          <th style="padding:10px 8px;text-align:left;color:#718096;font-weight:600">Animal</th>
                          <th style="padding:10px 8px;text-align:left;color:#718096;font-weight:600">Type</th>
                          <th style="padding:10px 8px;text-align:center;color:#718096;font-weight:600">Days</th>
                          <th style="padding:10px 8px;text-align:center;color:#718096;font-weight:600">Requests</th>
                          <th style="padding:10px 8px;text-align:center;color:#718096;font-weight:600">Score</th>
                          <th style="padding:10px 8px;text-align:left;color:#718096;font-weight:600">Level</th>
                          <th style="padding:10px 8px;text-align:left;color:#718096;font-weight:600">Top Recommendations</th>
                        </tr>
                      </thead>
                      <tbody>%s</tbody>
                    </table>
                  </div>

                  <!-- CTA -->
                  <div style="padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0">
                    <a href="http://localhost:4200/app/adoption/shelter/at-risk"
                       style="display:inline-block;background:rgb(58,146,130);color:white;
                              padding:12px 28px;border-radius:8px;text-decoration:none;
                              font-weight:bold;font-size:14px">
                      📊 View Full At-Risk Report
                    </a>
                  </div>

                  <div style="padding:14px;text-align:center;font-size:11px;color:#a0aec0;
                              background:#f4f6f8">
                    This report is generated automatically every Monday. Do not reply.
                  </div>
                </div>
                </body></html>
                """.formatted(shelterName, pets.size(), critical, atRisk, watch, rows);
    }
}