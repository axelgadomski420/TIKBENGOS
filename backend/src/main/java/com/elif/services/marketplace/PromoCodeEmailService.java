package com.elif.services.marketplace;

import com.elif.entities.marketplace.PromoCodeReward;
import com.elif.entities.user.User;
import com.elif.repositories.user.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class PromoCodeEmailService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    @Value("${app.mail.from:}")
    private String fromAddress;

    public void sendPromoCodeUnlockedEmail(Long userId, List<PromoCodeReward> rewards, int discountPercent, BigDecimal milestoneAmount) {
        if (userId == null || rewards == null || rewards.isEmpty()) {
            return;
        }

        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

            if (user.getEmail() == null || user.getEmail().isBlank()) {
                throw new IllegalArgumentException("User email is empty for user: " + userId);
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            if (fromAddress != null && !fromAddress.isBlank()) {
                helper.setFrom(Objects.requireNonNull(fromAddress));
            }

            helper.setTo(Objects.requireNonNull(user.getEmail()));
            String subject = rewards.size() > 1
                    ? "Your ELIF " + discountPercent + "% Promo Codes are ready"
                    : "Your ELIF " + discountPercent + "% Promo Code is ready";

            helper.setSubject(subject);
            helper.setText(buildEmailBody(user, rewards, discountPercent, milestoneAmount), true);

            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Promo-code email could not be sent to user {}: {}", userId, ex.getMessage());
        }
    }

    private String buildEmailBody(User user, List<PromoCodeReward> rewards, int discountPercent, BigDecimal milestoneAmount) {
        StringBuilder codesHtml = new StringBuilder();

        for (PromoCodeReward reward : rewards) {
            codesHtml.append("<li style='margin:8px 0;font-size:16px;font-weight:700;color:#0f172a;'>")
                    .append(escapeHtml(reward.getPromoCode()))
                    .append("</li>");
        }

        String firstName = user.getFirstName() == null ? "there" : escapeHtml(user.getFirstName());

        return "<!doctype html>"
                + "<html><body style='margin:0;padding:0;background:#f4f7f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;'>"
                + "<div style='max-width:680px;margin:0 auto;padding:32px 16px;'>"
                + "<div style='background:#ffffff;border:1px solid #d7ebe6;border-radius:18px;padding:28px;box-shadow:0 12px 26px rgba(15,23,42,.08);'>"
                + "<h1 style='margin:0 0 10px;color:#0f172a;font-size:28px;'>You unlocked a " + discountPercent + "% promo reward</h1>"
                + "<p style='margin:0 0 16px;color:#475569;line-height:1.7;'>Hi " + firstName + ", your total purchases crossed another $"
                + milestoneAmount.toPlainString()
                + " milestone, so we generated a new promo code for you.</p>"
                + "<div style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;'>"
                + "<p style='margin:0 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#64748b;font-weight:700;'>Your promo code"
                + (rewards.size() > 1 ? "s" : "")
                + "</p>"
                + "<ul style='margin:0;padding-left:18px;'>"
                + codesHtml
                + "</ul>"
                + "</div>"
                + "<p style='margin:16px 0 0;color:#475569;line-height:1.7;'>Apply this code at checkout to get " + discountPercent + "% off your order.</p>"
                + "<p style='margin:10px 0 0;color:#64748b;font-size:13px;'>Thank you for shopping with ELIF.</p>"
                + "</div></div></body></html>";
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
