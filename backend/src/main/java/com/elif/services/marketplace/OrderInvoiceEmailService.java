package com.elif.services.marketplace;

import com.elif.entities.marketplace.Order;
import com.elif.entities.marketplace.OrderItem;
import com.elif.entities.user.User;
import com.elif.repositories.marketplace.OrderRepository;
import com.elif.repositories.user.UserRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.awt.Color;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderInvoiceEmailService {

    private static final Color BRAND = new Color(58, 146, 130);
    private static final Color LIGHT_BG = new Color(241, 247, 249);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final OrderRepository orderRepository;
    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    @Value("${app.mail.from:}")
    private String fromAddress;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendOrderInvoiceEmail(OrderInvoiceRequestedEvent event) {
        try {
            sendOrderInvoiceEmailById(Objects.requireNonNull(event.orderId(), "Order id is required."));

        } catch (Exception e) {
            log.warn("Invoice email for order {} could not be sent: {}", event.orderId(), e.getMessage());
        }
    }

    public void sendOrderInvoiceEmail(Order order) {
        sendOrderInvoiceEmailById(order.getId());
    }

    private void sendOrderInvoiceEmailById(Long orderId) {
        try {
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

            Long userId = Objects.requireNonNull(order.getUserId(), "Order user id is required.");
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found for order: " + order.getId()));

            String targetEmail = user.getEmail();
            if (targetEmail == null || targetEmail.isBlank()) {
                throw new IllegalArgumentException("User email is empty for order: " + order.getId());
            }

            byte[] pdfBytes = generateInvoicePdf(order, user);
            String emailBody = buildEmailBody(user, order);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            if (fromAddress != null && !fromAddress.isBlank()) {
                helper.setFrom(Objects.requireNonNull(fromAddress));
            }

            helper.setTo(Objects.requireNonNull(targetEmail));
            helper.setSubject("ELIF Marketplace Invoice #" + order.getId());
            helper.setText(Objects.requireNonNull(emailBody), true);
            addInlineLogo(helper);
            helper.addAttachment(
                    "elif-order-" + order.getId() + ".pdf",
                new ByteArrayResource(Objects.requireNonNull(pdfBytes)),
                    "application/pdf"
            );

            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Invoice email for order {} could not be sent: {}", orderId, e.getMessage());
        }
    }

    public byte[] generateInvoicePdfByOrderId(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        Long userId = Objects.requireNonNull(order.getUserId(), "Order user id is required.");
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found for order: " + order.getId()));
        return generateInvoicePdf(order, user);
    }

    private String buildEmailBody(User user, Order order) {
        String paymentMethod = order.getPaymentMethod() == null ? "CASH" : order.getPaymentMethod().toString();
        boolean hasDiscount = order.getDiscountAmount() != null && order.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0;
        String discountCards = hasDiscount
            ? infoCard("Discount", "-$" + formatMoney(order.getDiscountAmount()))
            + infoCard("Promo Code", escapeHtml(order.getPromoCodeUsed() == null ? "Applied" : order.getPromoCodeUsed()))
            : "";

        return "<!doctype html>"
                + "<html><body style='margin:0;padding:0;background:#f4f7f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;'>"
                + "<div style='max-width:680px;margin:0 auto;padding:32px 16px;'>"
                + "<div style='background:linear-gradient(135deg,#f9fcfb 0%,#eef8f6 100%);border:1px solid #d7ebe6;border-radius:22px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,.08);'>"
                + "<div style='padding:28px 30px 20px;background:#ffffff;border-bottom:1px solid #e6efed;'>"
                + "<img src='cid:elifLogo' alt='ELIF' style='max-width:180px;height:auto;display:block;margin-bottom:18px;'/>"
                + "<div style='display:inline-block;padding:6px 12px;border-radius:999px;background:#e8f6f3;color:#22756a;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;'>Marketplace Invoice</div>"
                + "<h1 style='margin:18px 0 10px;font-size:28px;line-height:1.2;color:#0f172a;'>Your order is ready</h1>"
                + "<p style='margin:0;font-size:15px;line-height:1.7;color:#475569;'>Hi " + escapeHtml(user.getFirstName()) + ", thanks for shopping with ELIF. We have attached a polished PDF invoice for order <strong>#" + order.getId() + "</strong>.</p>"
                + "</div>"
                + "<div style='padding:24px 30px 30px;'>"
                + "<div style='display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;'>"
                + infoCard("Order #", String.valueOf(order.getId()))
                + infoCard("Payment", escapeHtml(paymentMethod))
                + infoCard("Total", "$" + formatMoney(order.getTotalAmount()))
                + infoCard("Customer", escapeHtml(user.getFirstName() + " " + user.getLastName()))
                + discountCards
                + "</div>"
                + "<div style='background:#fff;border:1px solid #d7ebe6;border-radius:18px;padding:18px 20px;margin-bottom:18px;'>"
                + "<p style='margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:700;'>What’s included</p>"
                + "<ul style='margin:0;padding-left:18px;color:#334155;line-height:1.8;'>"
                + "<li>A matching invoice PDF with the ELIF logo and branded layout</li>"
                + "<li>Full item breakdown, quantities, and totals</li>"
                + "<li>Saved attachment for your records</li>"
                + "</ul>"
                + "</div>"
                + "<div style='background:#0f766e;color:#f8fffe;border-radius:18px;padding:18px 20px;font-size:14px;line-height:1.7;'>"
                + "Please find your invoice attached as a PDF. If you have any questions, reply to this email and our team will help."
                + "</div>"
                + "<p style='margin:18px 2px 0;font-size:13px;color:#64748b;'>Regards,<br/><strong>ELIF Team</strong></p>"
                + "</div></div></div></body></html>";
    }

    private String infoCard(String label, String value) {
        return "<div style='background:#fff;border:1px solid #d7ebe6;border-radius:16px;padding:14px 16px;min-height:76px;'>"
                + "<div style='font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:8px;'>"
                + escapeHtml(label)
                + "</div>"
                + "<div style='font-size:16px;color:#0f172a;font-weight:700;line-height:1.4;'>"
                + escapeHtml(value)
                + "</div>"
                + "</div>";
    }

    private void addInlineLogo(MimeMessageHelper helper) throws IOException, MessagingException {
        Path logoPath = Paths.get("..", "frontend", "public", "images", "logo", "logo-full.png").toAbsolutePath().normalize();
        if (!Files.exists(logoPath)) {
            logoPath = Paths.get("..", "frontend", "public", "images", "logo", "logo-full-transparent.png").toAbsolutePath().normalize();
        }

        if (Files.exists(logoPath)) {
            helper.addInline("elifLogo", new FileSystemResource(logoPath.toFile()));
        }
    }

    private byte[] generateInvoicePdf(Order order, User user) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 42, 42);
            PdfWriter.getInstance(document, outputStream);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, BRAND);
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new java.awt.Color(80, 80, 80));
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(60, 60, 60));
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new java.awt.Color(35, 35, 35));

            addHeader(document, order, titleFont, subtitleFont);
            document.add(new Paragraph(" "));

            document.add(detailRow("Order ID:", String.valueOf(order.getId()), labelFont, valueFont));
            document.add(detailRow("Customer:", user.getFirstName() + " " + user.getLastName(), labelFont, valueFont));
            document.add(detailRow("Email:", user.getEmail(), labelFont, valueFont));
            document.add(detailRow("Payment:", String.valueOf(order.getPaymentMethod() == null ? "CASH" : order.getPaymentMethod()), labelFont, valueFont));
            if (order.getCreatedAt() != null) {
                document.add(detailRow("Date:", order.getCreatedAt().format(DATE_FORMAT), labelFont, valueFont));
            }

            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(new float[]{4.2f, 1.2f, 2.0f, 2.0f});
            table.setWidthPercentage(100f);
            table.setSpacingBefore(8f);
            table.setSpacingAfter(10f);

            table.addCell(headerCell("Product"));
            table.addCell(headerCell("Qty"));
            table.addCell(headerCell("Unit Price"));
            table.addCell(headerCell("Subtotal"));

            for (OrderItem item : order.getOrderItems()) {
                table.addCell(valueCell(item.getProductName()));
                table.addCell(valueCell(String.valueOf(item.getQuantity())));
                table.addCell(valueCell(formatMoney(item.getUnitPrice())));
                table.addCell(valueCell(formatMoney(item.getSubtotal())));
            }

            document.add(table);

            if (order.getDiscountAmount() != null && order.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                PdfPTable discountTable = new PdfPTable(new float[]{7f, 2f});
                discountTable.setWidthPercentage(100f);

                String discountLabel = "Promo Discount";
                if (order.getPromoCodeUsed() != null && !order.getPromoCodeUsed().isBlank()) {
                    discountLabel += " (" + order.getPromoCodeUsed() + ")";
                }

                discountTable.addCell(totalLabelCell(discountLabel));
                discountTable.addCell(totalValueCell("-" + formatMoney(order.getDiscountAmount())));
                document.add(discountTable);
            }

            PdfPTable totalTable = new PdfPTable(new float[]{7f, 2f});
            totalTable.setWidthPercentage(100f);
            totalTable.addCell(totalLabelCell("Grand Total"));
            totalTable.addCell(totalValueCell(formatMoney(order.getTotalAmount())));
            document.add(totalTable);

            Paragraph footer = new Paragraph("Thank you for shopping with ELIF.", subtitleFont);
            footer.setSpacingBefore(18f);
            document.add(footer);

            document.close();
            return outputStream.toByteArray();
        } catch (DocumentException | IOException e) {
            throw new IllegalArgumentException("Failed to generate invoice PDF: " + e.getMessage());
        }
    }

    private void addHeader(Document document, Order order, Font titleFont, Font subtitleFont) throws DocumentException, IOException {
        PdfPTable header = new PdfPTable(new float[]{2f, 3f});
        header.setWidthPercentage(100f);

        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        Image logo = loadLogo();
        if (logo != null) {
            logo.scaleToFit(120f, 46f);
            logoCell.addElement(logo);
        } else {
            logoCell.addElement(new Paragraph("ELIF", titleFont));
        }

        PdfPCell textCell = new PdfPCell();
        textCell.setBorder(Rectangle.NO_BORDER);
        Paragraph title = new Paragraph("Marketplace Invoice", titleFont);
        title.setAlignment(2);
        textCell.addElement(title);
        Paragraph ref = new Paragraph("Invoice Ref: ELIF-" + order.getId(), subtitleFont);
        ref.setAlignment(2);
        textCell.addElement(ref);

        header.addCell(logoCell);
        header.addCell(textCell);
        document.add(header);
    }

    private Paragraph detailRow(String label, String value, Font labelFont, Font valueFont) {
        Phrase line = new Phrase();
        line.add(new Phrase(label + " ", labelFont));
        line.add(new Phrase(value == null ? "-" : value, valueFont));
        Paragraph row = new Paragraph(line);
        row.setSpacingAfter(2f);
        return row;
    }

    private Image loadLogo() throws IOException {
        Path[] candidates = new Path[] {
            Paths.get("..", "frontend", "public", "images", "logo", "logo-full.png"),
            Paths.get("..", "frontend", "public", "images", "logo", "logo-full-transparent.png")
        };

        for (Path candidate : candidates) {
            Path absolute = candidate.toAbsolutePath().normalize();
            if (Files.exists(absolute)) {
                try {
                    return Image.getInstance(absolute.toString());
                } catch (Exception ignored) {
                }
            }
        }
        return null;
    }

    private PdfPCell headerCell(String value) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE);
        PdfPCell cell = new PdfPCell(new Phrase(value, font));
        cell.setBackgroundColor(BRAND);
        cell.setPadding(8f);
        cell.setBorderColor(new java.awt.Color(220, 220, 220));
        return cell;
    }

    private PdfPCell valueCell(String value) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA, 10, new java.awt.Color(40, 40, 40));
        PdfPCell cell = new PdfPCell(new Phrase(value, font));
        cell.setPadding(8f);
        cell.setBackgroundColor(LIGHT_BG);
        cell.setBorderColor(new java.awt.Color(225, 225, 225));
        return cell;
    }

    private PdfPCell totalLabelCell(String value) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new java.awt.Color(50, 50, 50));
        PdfPCell cell = new PdfPCell(new Phrase(value, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(2);
        cell.setPadding(8f);
        return cell;
    }

    private PdfPCell totalValueCell(String value) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, BRAND);
        PdfPCell cell = new PdfPCell(new Phrase(value, font));
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(BRAND);
        cell.setPadding(8f);
        cell.setHorizontalAlignment(1);
        return cell;
    }

    private String formatMoney(BigDecimal amount) {
        return amount == null ? "0.00" : amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
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
