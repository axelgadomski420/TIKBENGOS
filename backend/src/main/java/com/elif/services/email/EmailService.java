package com.elif.services.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service("userEmailService")
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    public boolean isConfigured() {
        return mailUsername != null && !mailUsername.isBlank()
                && fromEmail != null && !fromEmail.isBlank();
    }

    public void sendHtmlEmail(String toEmail, String subject, String htmlContent) throws MessagingException {
        validateMailConfiguration();

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText("", htmlContent);

        try {
            mailSender.send(message);
            log.info("HTML email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send HTML email to: {}", toEmail, e);
            throw e;
        }
    }

    public void sendPasswordResetEmail(String toEmail, String resetToken, String userName) throws MessagingException {
        validateMailConfiguration();

        log.info("Sending password reset email to: {}", toEmail);
        log.debug("From email: {}, Frontend URL: {}", fromEmail, frontendBaseUrl);

        String resetLink = frontendBaseUrl + "/auth/reset-password?token=" + resetToken;
        String plainName = (userName == null || userName.isBlank()) ? "there" : userName.trim();
        String greetingHtml = (userName == null || userName.isBlank()) ? "there" : escapeHtml(userName.trim());
        String subject = "Elif ÔÇö reset your password";

        String plainText = buildPasswordResetPlain(plainName, resetLink);
        String siteBase = frontendBaseUrl.endsWith("/") ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1) : frontendBaseUrl;
        String htmlContent = buildPasswordResetHtml(greetingHtml, resetLink, siteBase);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(plainText, htmlContent);
        
        try {
            mailSender.send(message);
            log.info("Password reset email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            throw e;
        }
    }

    private void validateMailConfiguration() {
        if (mailUsername == null || mailUsername.isBlank()) {
            throw new IllegalStateException("SMTP is not configured: SPRING_MAIL_USERNAME is empty.");
        }
        if (fromEmail == null || fromEmail.isBlank()) {
            throw new IllegalStateException("SMTP is not configured: APP_MAIL_FROM is empty.");
        }
    }

    private static String buildPasswordResetPlain(String displayName, String resetLink) {
        return """
                ELIF ÔÇö PASSWORD RESET
                ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

                Hi %s,

                We got a request to reset the password for your Elif account.

                Open this link (valid for 1 hour):
                %s

                ÔÇöÔÇöÔÇÔöÇ
                Didn't ask for this?
                Ignore this email. Your password stays the same.

                Stay safe:
                ÔÇó Don't share this link.
                ÔÇó Elif will never ask for your password by email.

                ÔÇö
                Elif ┬À Petcare platform
                """.formatted(displayName, resetLink);
    }

    private static String buildPasswordResetHtml(String greetingNameEscaped, String resetLink, String siteBaseUrl) {
        String font = "'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
        String logoUrl = siteBaseUrl + "/images/logo/logo-cropped-transparent.png";
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width,initial-scale=1.0">
                    <title>Reset your password ┬À Elif</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
                </head>
                <body style="margin:0;padding:0;background-color:#f9fafb;">
                <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Reset your Elif password ÔÇö link expires in one hour.</div>
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;">
                    <tr>
                        <td align="center" style="padding:48px 20px;">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:28rem;background-color:#ffffff;border-radius:16px;border:1px solid #f3f4f6;box-shadow:0 10px 15px -3px rgba(0,0,0,0.06),0 4px 6px -2px rgba(0,0,0,0.03);">
                                <tr>
                                    <td align="center" style="padding:32px 32px 8px 32px;">
                                        <img src="%s" width="80" alt="Elif" style="display:block;height:auto;max-width:80px;border:0;outline:none;text-decoration:none;">
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding:8px 32px 0 32px;font-family:%s;">
                                        <h1 style="margin:0;font-size:28px;font-weight:800;line-height:1.2;color:#111827;letter-spacing:-0.02em;">Reset your password</h1>
                                        <p style="margin:10px 0 0 0;font-size:14px;line-height:1.5;color:#4b5563;">Tap the button below to choose a new password for your account.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:28px 32px 0 32px;font-family:%s;font-size:15px;line-height:1.65;color:#374151;">
                                        <p style="margin:0 0 8px 0;">Hello <span style="color:#111827;font-weight:600;">%s</span>,</p>
                                        <p style="margin:0;">If you asked for this email, you are all set. If not, you can ignore itÔÇöyour password will stay the same.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:28px 32px 36px 32px;">
                                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" style="border-radius:9999px;background-color:#3A9282;box-shadow:0 4px 6px -1px rgba(58,146,130,0.35),0 2px 4px -1px rgba(58,146,130,0.2);">
                                                    <a href="%s" target="_blank" rel="noopener noreferrer" style="display:block;padding:14px 28px;font-family:%s;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;text-align:center;border-radius:9999px;">Reset password</a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin:22px 0 0 0;font-family:%s;font-size:12px;line-height:1.55;color:#6b7280;text-align:center;">This link expires in <strong style="color:#374151;">one hour</strong>. Elif will never ask for your password by email.</p>
                                        <p style="margin:16px 0 0 0;font-family:%s;font-size:11px;line-height:1.5;color:#9ca3af;text-align:center;">Automated message ┬À do not reply</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:24px 0 0 0;font-family:%s;font-size:12px;color:#9ca3af;">Elif <span style="color:#F89A3F;">┬À</span> Petcare platform</p>
                        </td>
                    </tr>
                </table>
                </body>
                </html>
                """.formatted(logoUrl, font, font, greetingNameEscaped, resetLink, font, font, font, font);
    }

    private static String escapeHtml(String value) {
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
