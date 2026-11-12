package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.response.TransitDashboardDTO;
import com.elif.entities.pet_transit.TravelDestination;
import com.elif.entities.pet_transit.TravelFeedback;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.DestinationStatus;
import com.elif.entities.pet_transit.enums.FeedbackType;
import com.elif.entities.pet_transit.enums.ProcessingStatus;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.entities.pet_transit.enums.UrgencyLevel;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.exceptions.pet_transit.UnauthorizedTravelAccessException;
import com.elif.repositories.pet_transit.TravelDestinationRepository;
import com.elif.repositories.pet_transit.TravelFeedbackRepository;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import com.elif.repositories.user.UserRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPCellEvent;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransitExportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter PDF_HEADER_TIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy, HH:mm:ss");
    private static final Color BRAND_TEAL = new Color(15, 118, 110);
    private static final Color BRAND_ORANGE = new Color(248, 154, 63); // #F89A3F
    private static final Color HEADER_BG = new Color(241, 245, 249);
    private static final Color ROW_ALT_BG = new Color(248, 250, 252);

    private final TransitStatisticsService transitStatisticsService;
    private final TravelDestinationRepository destinationRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelFeedbackRepository travelFeedbackRepository;
    private final UserRepository userRepository;

    public byte[] exportOverviewPdf(Long adminId) {
        TransitDashboardDTO stats = transitStatisticsService.getStatistics(adminId);

        List<String[]> rows = List.of(
                row("Total destinations", longText(stats.getTotalDestinations())),
                row("Published destinations", longText(stats.getPublishedDestinations())),
                row("Scheduled destinations", longText(stats.getScheduledDestinations())),
                row("Draft destinations", longText(stats.getDraftDestinations())),
                row("Archived destinations", longText(stats.getArchivedDestinations())),
                row("Total travel plans", longText(stats.getTotalTravelPlans())),
                row("Submitted plans", longText(stats.getSubmittedPlans())),
                row("In preparation plans", longText(stats.getInPreparationPlans())),
                row("Approved plans", longText(stats.getApprovedPlans())),
                row("Rejected plans", longText(stats.getRejectedPlans())),
                row("Completed plans", longText(stats.getCompletedPlans())),
                row("Total feedback", longText(stats.getTotalFeedback())),
                row("Open feedback", longText(stats.getOpenFeedback())),
                row("Resolved feedback", longText(stats.getResolvedFeedback())),
                row("Resolution rate", resolutionRate(stats.getResolvedFeedback(), stats.getTotalFeedback()) + "%")
        );

        return buildPdf("Transit Overview Summary", null,
                new String[]{"Metric", "Value"}, rows);
    }

    public byte[] exportOverviewExcel(Long adminId) {
        TransitDashboardDTO stats = transitStatisticsService.getStatistics(adminId);

        List<String[]> rows = List.of(
                row("Total destinations", longText(stats.getTotalDestinations())),
                row("Published destinations", longText(stats.getPublishedDestinations())),
                row("Scheduled destinations", longText(stats.getScheduledDestinations())),
                row("Draft destinations", longText(stats.getDraftDestinations())),
                row("Archived destinations", longText(stats.getArchivedDestinations())),
                row("Total travel plans", longText(stats.getTotalTravelPlans())),
                row("Submitted plans", longText(stats.getSubmittedPlans())),
                row("In preparation plans", longText(stats.getInPreparationPlans())),
                row("Approved plans", longText(stats.getApprovedPlans())),
                row("Rejected plans", longText(stats.getRejectedPlans())),
                row("Completed plans", longText(stats.getCompletedPlans())),
                row("Total feedback", longText(stats.getTotalFeedback())),
                row("Open feedback", longText(stats.getOpenFeedback())),
                row("Resolved feedback", longText(stats.getResolvedFeedback())),
                row("Resolution rate", resolutionRate(stats.getResolvedFeedback(), stats.getTotalFeedback()) + "%")
        );

        return buildExcel(
            "Transit Overview Summary",
            "overview",
            null,
            new String[]{"Metric", "Value"},
            rows
        );
    }

    public byte[] exportDestinationsPdf(Long adminId, String status, String search, String appliedFilters) {
        List<TravelDestination> destinations = findFilteredDestinations(adminId, status, search);

        List<String[]> rows = new ArrayList<>();
        for (TravelDestination destination : destinations) {
            rows.add(new String[]{
                    text(destination.getTitle()),
                    text(destination.getCountry()),
                    text(destination.getRegion()),
                    enumText(destination.getStatus()),
                    enumText(destination.getDestinationType()),
                    enumText(destination.getRecommendedTransportType()),
                    text(destination.getPetFriendlyLevel()),
                    dateTimeText(destination.getCreatedAt())
            });
        }

        return buildPdf(
                "Transit Destinations Export",
                resolveAppliedFilters(appliedFilters, "Status", enumText(parseDestinationStatus(status)), "Search", textIfPresent(search)),
                new String[]{"Title", "Country", "Region", "Status", "Type", "Transport", "Pet-Friendly Level", "Created"},
                rows
        );
    }

    public byte[] exportDestinationsExcel(Long adminId, String status, String search, String appliedFilters) {
        List<TravelDestination> destinations = findFilteredDestinations(adminId, status, search);

        List<String[]> rows = new ArrayList<>();
        for (TravelDestination destination : destinations) {
            rows.add(new String[]{
                    text(destination.getTitle()),
                    text(destination.getCountry()),
                    text(destination.getRegion()),
                    enumText(destination.getStatus()),
                    enumText(destination.getDestinationType()),
                    enumText(destination.getRecommendedTransportType()),
                    text(destination.getPetFriendlyLevel()),
                    dateTimeText(destination.getCreatedAt())
            });
        }

        String resolvedFilters = resolveAppliedFilters(appliedFilters, "Status", enumText(parseDestinationStatus(status)), "Search", textIfPresent(search));

        return buildExcel("Transit Destinations Export",
            "destinations",
            resolvedFilters,
                new String[]{"Title", "Country", "Region", "Status", "Type", "Transport", "Pet-Friendly Level", "Created"},
                rows);
    }

    public byte[] exportTravelPlansPdf(Long adminId, String status, String search, String travelDate, String appliedFilters) {
        List<TravelPlan> plans = findFilteredPlans(adminId, status, search, travelDate);

        List<String[]> rows = new ArrayList<>();
        for (TravelPlan plan : plans) {
            rows.add(new String[]{
                    longText(plan.getId()),
                    ownerName(plan),
                    longText(plan.getPetId()),
                    text(plan.getDestination() != null ? plan.getDestination().getTitle() : null),
                    text(plan.getDestination() != null ? plan.getDestination().getCountry() : null),
                    enumText(plan.getStatus()),
                    dateText(plan.getTravelDate()),
                    scoreText(plan.getReadinessScore()),
                    enumText(plan.getSafetyStatus()),
                    dateTimeText(plan.getCreatedAt())
            });
        }

        return buildPdf(
                "Transit Travel Plans Export",
            resolveAppliedFilters(
                appliedFilters,
                "Status", enumText(parsePlanStatus(status)),
                "Search", textIfPresent(search),
                "Travel Date", textIfPresent(travelDate)
            ),
                new String[]{"Plan", "Client", "Pet", "Destination", "Country", "Status", "Travel Date", "Readiness", "Safety", "Created"},
                rows
        );
    }

        public byte[] exportTravelPlansExcel(Long adminId, String status, String search, String travelDate, String appliedFilters) {
        List<TravelPlan> plans = findFilteredPlans(adminId, status, search, travelDate);

        List<String[]> rows = new ArrayList<>();
        for (TravelPlan plan : plans) {
            rows.add(new String[]{
                    longText(plan.getId()),
                    ownerName(plan),
                    longText(plan.getPetId()),
                    text(plan.getDestination() != null ? plan.getDestination().getTitle() : null),
                    text(plan.getDestination() != null ? plan.getDestination().getCountry() : null),
                    enumText(plan.getStatus()),
                    dateText(plan.getTravelDate()),
                    scoreText(plan.getReadinessScore()),
                    enumText(plan.getSafetyStatus()),
                    dateTimeText(plan.getCreatedAt())
            });
        }

            String resolvedFilters = resolveAppliedFilters(
                appliedFilters,
                "Status", enumText(parsePlanStatus(status)),
                "Search", textIfPresent(search),
                "Travel Date", textIfPresent(travelDate)
            );

            return buildExcel("Transit Travel Plans Export",
                "travel-plans",
                resolvedFilters,
                new String[]{"Plan", "Client", "Pet", "Destination", "Country", "Status", "Travel Date", "Readiness", "Safety", "Created"},
                rows);
    }

    public byte[] exportFeedbackPdf(Long adminId, String type, String status, String search, String appliedFilters) {
        List<TravelFeedback> feedbacks = findFilteredFeedback(adminId, type, status, search);

        List<String[]> rows = new ArrayList<>();
        for (TravelFeedback feedback : feedbacks) {
            rows.add(new String[]{
                    longText(feedback.getId()),
                    ownerName(feedback),
                    text(feedback.getTravelPlan() != null && feedback.getTravelPlan().getDestination() != null
                            ? feedback.getTravelPlan().getDestination().getTitle()
                            : null),
                    enumText(feedback.getFeedbackType()),
                    enumText(feedback.getUrgencyLevel()),
                    enumText(feedback.getProcessingStatus()),
                    text(feedback.getTitle()),
                    text(feedback.getMessage()),
                    dateTimeText(feedback.getCreatedAt())
            });
        }

        return buildPdf(
                "Transit Feedback Export",
            resolveAppliedFilters(
                appliedFilters,
                "Type", enumText(parseFeedbackType(type)),
                "Status", enumText(parseProcessingStatus(status)),
                "Search", textIfPresent(search)
            ),
                new String[]{"Feedback", "Client", "Destination", "Type", "Urgency", "Status", "Title", "Message", "Created"},
                rows
        );
    }

        public byte[] exportFeedbackExcel(Long adminId, String type, String status, String search, String appliedFilters) {
        List<TravelFeedback> feedbacks = findFilteredFeedback(adminId, type, status, search);

        List<String[]> rows = new ArrayList<>();
        for (TravelFeedback feedback : feedbacks) {
            rows.add(new String[]{
                    longText(feedback.getId()),
                    ownerName(feedback),
                    text(feedback.getTravelPlan() != null && feedback.getTravelPlan().getDestination() != null
                            ? feedback.getTravelPlan().getDestination().getTitle()
                            : null),
                    enumText(feedback.getFeedbackType()),
                    enumText(feedback.getUrgencyLevel()),
                    enumText(feedback.getProcessingStatus()),
                    text(feedback.getTitle()),
                    text(feedback.getMessage()),
                    dateTimeText(feedback.getCreatedAt())
            });
        }

            String resolvedFilters = resolveAppliedFilters(
                appliedFilters,
                "Type", enumText(parseFeedbackType(type)),
                "Status", enumText(parseProcessingStatus(status)),
                "Search", textIfPresent(search)
            );

            return buildExcel("Transit Feedback Export",
                "feedback",
                resolvedFilters,
                new String[]{"Feedback", "Client", "Destination", "Type", "Urgency", "Status", "Title", "Message", "Created"},
                rows);
    }

    private List<TravelDestination> findFilteredDestinations(Long adminId, String statusFilter, String searchFilter) {
        validateAdmin(adminId);

        DestinationStatus status = parseDestinationStatus(statusFilter);
        String keyword = normalize(searchFilter);

        return destinationRepository.findAll()
                .stream()
                .filter(destination -> status == null || destination.getStatus() == status)
                .filter(destination -> keyword.isEmpty() || destinationMatchesSearch(destination, keyword))
                .sorted(Comparator.comparing(TravelDestination::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private List<TravelPlan> findFilteredPlans(Long adminId, String statusFilter, String searchFilter, String travelDateFilter) {
        validateAdmin(adminId);

        TravelPlanStatus status = parsePlanStatus(statusFilter);
        LocalDate travelDate = parseLocalDate(travelDateFilter);
        String keyword = normalize(searchFilter);

        Comparator<TravelPlan> createdAtDesc = Comparator.comparing(
                TravelPlan::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())
        );

        List<TravelPlan> filtered = travelPlanRepository.findAdminVisiblePlansOrderByCreatedAtDesc()
                .stream()
                .filter(plan -> status == null || plan.getStatus() == status)
                .filter(plan -> travelDate == null || travelDate.equals(plan.getTravelDate()))
                .filter(plan -> keyword.isEmpty() || travelPlanMatchesSearch(plan, keyword))
                .toList();

        if (status == null) {
            Map<TravelPlanStatus, Integer> priority = new HashMap<>();
            priority.put(TravelPlanStatus.SUBMITTED, 0);
            priority.put(TravelPlanStatus.APPROVED, 1);
            priority.put(TravelPlanStatus.IN_PREPARATION, 2);
            priority.put(TravelPlanStatus.DRAFT, 3);
            priority.put(TravelPlanStatus.REJECTED, 4);
            priority.put(TravelPlanStatus.COMPLETED, 5);
            priority.put(TravelPlanStatus.CANCELLED, 6);

            return filtered.stream()
                    .sorted(Comparator
                            .comparing((TravelPlan plan) -> priority.getOrDefault(plan.getStatus(), 99))
                            .thenComparing(createdAtDesc))
                    .toList();
        }

        return filtered.stream().sorted(createdAtDesc).toList();
    }

    private List<TravelFeedback> findFilteredFeedback(Long adminId, String typeFilter, String statusFilter, String searchFilter) {
        validateAdmin(adminId);

        FeedbackType type = parseFeedbackType(typeFilter);
        ProcessingStatus status = parseProcessingStatus(statusFilter);
        String keyword = normalize(searchFilter);

        return travelFeedbackRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(feedback -> type == null || feedback.getFeedbackType() == type)
                .filter(feedback -> status == null || feedback.getProcessingStatus() == status)
                .filter(feedback -> keyword.isEmpty() || feedbackMatchesSearch(feedback, keyword))
                .toList();
    }

    private boolean destinationMatchesSearch(TravelDestination destination, String keyword) {
        String pool = String.join(" ",
                text(destination.getTitle()),
                text(destination.getCountry()),
                text(destination.getRegion())
        ).toLowerCase(Locale.ROOT);

        return pool.contains(keyword);
    }

    private boolean travelPlanMatchesSearch(TravelPlan plan, String keyword) {
        String statusLabel = humanizeEnum(plan.getStatus() != null ? plan.getStatus().name() : "");

        String pool = String.join(" ",
                ownerName(plan),
                text(plan.getPetId()),
                text(plan.getDestination() != null ? plan.getDestination().getTitle() : null),
                text(plan.getDestination() != null ? plan.getDestination().getCountry() : null),
                text(plan.getOrigin()),
                enumText(plan.getTransportType()),
                enumText(plan.getStatus()),
                statusLabel
        ).toLowerCase(Locale.ROOT);

        return pool.contains(keyword);
    }

    private boolean feedbackMatchesSearch(TravelFeedback feedback, String keyword) {
        String pool = String.join(" ",
                text(feedback.getTravelPlan() != null && feedback.getTravelPlan().getDestination() != null
                        ? feedback.getTravelPlan().getDestination().getTitle()
                        : null),
                ownerName(feedback),
                enumText(feedback.getFeedbackType()),
                text(feedback.getMessage()),
                text(feedback.getTitle())
        ).toLowerCase(Locale.ROOT);

        return pool.contains(keyword);
    }

    private byte[] buildPdf(String reportTitle, String appliedFilters, String[] headers, List<String[]> rows) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 32);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new TransitPdfPageEvent(reportTitle));
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 14f, Font.BOLD, Color.WHITE);
            Font generatedFont = new Font(Font.HELVETICA, 8.7f, Font.NORMAL, Color.WHITE);
            Font subtitleFont = new Font(Font.HELVETICA, 8.7f, Font.NORMAL, new Color(229, 244, 241));
            Font headerFont = new Font(Font.HELVETICA, 9.3f, Font.BOLD, Color.WHITE);
            Font cellFont = new Font(Font.HELVETICA, 8.8f, Font.NORMAL, new Color(30, 41, 59));

            PdfPTable topBanner = new PdfPTable(1);
            topBanner.setWidthPercentage(100f);
            topBanner.setSpacingAfter(12f);
            PdfPCell bannerCell = new PdfPCell();
            bannerCell.setBorder(Rectangle.NO_BORDER);
            bannerCell.setFixedHeight(62f);
            bannerCell.setCellEvent(
                    new TopRoundedHeaderCellEvent(
                            BRAND_TEAL,
                            "Pet Transit Directory Export",
                            "Generated " + LocalDateTime.now().format(PDF_HEADER_TIME_FMT),
                            buildHeaderSubtitle(appliedFilters),
                            titleFont,
                            generatedFont,
                            subtitleFont
                    )
            );
            topBanner.addCell(bannerCell);
            document.add(topBanner);

            addSectionHeader(document, "Report Data");

            PdfPTable table = new PdfPTable(headers.length);
            table.setWidthPercentage(100f);
            table.setSpacingBefore(0f);

            float[] widths = new float[headers.length];
            for (int i = 0; i < headers.length; i++) {
                String header = text(headers[i]).toLowerCase(Locale.ROOT);
                widths[i] = switch (header) {
                    case "message", "title" -> 2.4f;
                    case "status", "urgency", "safety", "type" -> 1.2f;
                    case "travel date", "created", "country" -> 1.35f;
                    default -> 1.5f;
                };
            }
            table.setWidths(widths);

            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(text(header), headerFont));
                cell.setHorizontalAlignment(Element.ALIGN_LEFT);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setPadding(6.4f);
                cell.setBackgroundColor(BRAND_TEAL);
                cell.setBorderColor(BRAND_TEAL);
                table.addCell(cell);
            }

            for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
                String[] row = rows.get(rowIndex);
                boolean useAlt = rowIndex % 2 == 1;
                for (int index = 0; index < headers.length; index++) {
                    String value = index < row.length ? row[index] : "";
                    PdfPCell cell = new PdfPCell(new Phrase(text(value), cellFont));
                    cell.setVerticalAlignment(Element.ALIGN_TOP);
                    cell.setPadding(5.5f);
                    cell.setBorderColor(new Color(226, 232, 240));
                    if (useAlt) {
                        cell.setBackgroundColor(ROW_ALT_BG);
                    }
                    if (isStatusLikeHeader(headers[index])) {
                        Color semanticColor = semanticColorForValue(value);
                        cell.getPhrase().getFont().setColor(semanticColor);
                    }
                    if (isIdentityHighlightHeader(headers[index])) {
                        cell.getPhrase().getFont().setColor(BRAND_ORANGE);
                    }
                    table.addCell(cell);
                }
            }

            if (rows.isEmpty()) {
                PdfPCell emptyCell = new PdfPCell(new Phrase("No rows match the selected filters.", cellFont));
                emptyCell.setColspan(headers.length);
                emptyCell.setPadding(7f);
                emptyCell.setBackgroundColor(HEADER_BG);
                table.addCell(emptyCell);
            }

            document.add(table);
            document.close();
            return outputStream.toByteArray();
        } catch (IOException | DocumentException ex) {
            throw new IllegalStateException("Unable to generate PDF export", ex);
        }
    }

    private byte[] buildExcel(String reportTitle, String sheetName, String appliedFilters, String[] headers, List<String[]> rows) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            short dateFmt = workbook.createDataFormat().getFormat("yyyy-mm-dd");
            short dateTimeFmt = workbook.createDataFormat().getFormat("yyyy-mm-dd hh:mm");
            short integerFmt = workbook.createDataFormat().getFormat("0");
            short decimalFmt = workbook.createDataFormat().getFormat("0.00");

            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setColor(IndexedColors.WHITE.getIndex());
            titleFont.setFontHeightInPoints((short) 13);

            org.apache.poi.ss.usermodel.Font subtitleFont = workbook.createFont();
            subtitleFont.setColor(IndexedColors.GREY_25_PERCENT.getIndex());

            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFillForegroundColor(IndexedColors.TEAL.getIndex());
            titleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            titleStyle.setAlignment(HorizontalAlignment.LEFT);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            titleStyle.setFont(titleFont);

            CellStyle subtitleStyle = workbook.createCellStyle();
            subtitleStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            subtitleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            subtitleStyle.setAlignment(HorizontalAlignment.LEFT);
            subtitleStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            subtitleStyle.setFont(subtitleFont);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.TEAL.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.LEFT);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setFont(headerFont);

            CellStyle bodyStyle = workbook.createCellStyle();
            bodyStyle.setVerticalAlignment(VerticalAlignment.TOP);
            bodyStyle.setAlignment(HorizontalAlignment.LEFT);
            bodyStyle.setWrapText(true);
            bodyStyle.setBorderBottom(BorderStyle.THIN);
            bodyStyle.setBorderTop(BorderStyle.THIN);
            bodyStyle.setBorderLeft(BorderStyle.THIN);
            bodyStyle.setBorderRight(BorderStyle.THIN);
            bodyStyle.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            bodyStyle.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            bodyStyle.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            bodyStyle.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());

            CellStyle bodyAltStyle = workbook.createCellStyle();
            bodyAltStyle.cloneStyleFrom(bodyStyle);
            bodyAltStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            bodyAltStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle bodyDateStyle = workbook.createCellStyle();
            bodyDateStyle.cloneStyleFrom(bodyStyle);
            bodyDateStyle.setDataFormat(dateFmt);

            CellStyle bodyDateTimeStyle = workbook.createCellStyle();
            bodyDateTimeStyle.cloneStyleFrom(bodyStyle);
            bodyDateTimeStyle.setDataFormat(dateTimeFmt);

            CellStyle bodyIntegerStyle = workbook.createCellStyle();
            bodyIntegerStyle.cloneStyleFrom(bodyStyle);
            bodyIntegerStyle.setDataFormat(integerFmt);

            CellStyle bodyDecimalStyle = workbook.createCellStyle();
            bodyDecimalStyle.cloneStyleFrom(bodyStyle);
            bodyDecimalStyle.setDataFormat(decimalFmt);

            CellStyle statusGoodStyle = workbook.createCellStyle();
            statusGoodStyle.cloneStyleFrom(bodyStyle);
            statusGoodStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            statusGoodStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle statusWarnStyle = workbook.createCellStyle();
            statusWarnStyle.cloneStyleFrom(bodyStyle);
            statusWarnStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
            statusWarnStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle statusRiskStyle = workbook.createCellStyle();
            statusRiskStyle.cloneStyleFrom(bodyStyle);
            statusRiskStyle.setFillForegroundColor(IndexedColors.ROSE.getIndex());
            statusRiskStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(23f);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(text(reportTitle));
            titleCell.setCellStyle(titleStyle);
            if (headers.length > 1) {
                sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, headers.length - 1));
            }

            Row subtitleRow = sheet.createRow(1);
            subtitleRow.setHeightInPoints(18f);
            Cell subtitleCell = subtitleRow.createCell(0);
            subtitleCell.setCellValue(buildMetaLine(appliedFilters) + " | " + sheetName + " export");
            subtitleCell.setCellStyle(subtitleStyle);
            if (headers.length > 1) {
                sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, headers.length - 1));
            }

            Row headerRow = sheet.createRow(3);
            for (int index = 0; index < headers.length; index++) {
                Cell cell = headerRow.createCell(index);
                cell.setCellValue(text(headers[index]));
                cell.setCellStyle(headerStyle);
            }

            for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
                Row row = sheet.createRow(rowIndex + 4);
                row.setHeightInPoints(19f);
                String[] rowValues = rows.get(rowIndex);
                boolean rowAlt = rowIndex % 2 == 1;
                boolean urgentIncident = isUrgentIncidentRow(sheetName, headers, rowValues);

                for (int colIndex = 0; colIndex < headers.length; colIndex++) {
                    Cell cell = row.createCell(colIndex);

                    String header = text(headers[colIndex]);
                    String value = colIndex < rowValues.length ? text(rowValues[colIndex]) : "";
                    CellStyle baseStyle = rowAlt ? bodyAltStyle : bodyStyle;

                    if (isDateHeader(header) && trySetDateCell(cell, value, bodyDateStyle, bodyDateTimeStyle)) {
                        continue;
                    }

                    if (isNumericHeader(header) && trySetNumericCell(cell, value, bodyIntegerStyle, bodyDecimalStyle)) {
                        continue;
                    }

                    cell.setCellValue(value);

                    CellStyle semanticStyle = semanticExcelStyle(
                            header,
                            value,
                            baseStyle,
                            statusGoodStyle,
                            statusWarnStyle,
                            statusRiskStyle,
                            urgentIncident
                    );
                    cell.setCellStyle(semanticStyle);
                }
            }

            sheet.createFreezePane(0, 4);
            sheet.setAutoFilter(new CellRangeAddress(3, 3, 0, headers.length - 1));

            for (int colIndex = 0; colIndex < headers.length; colIndex++) {
                sheet.autoSizeColumn(colIndex);
                int width = sheet.getColumnWidth(colIndex);
                int minWidth = 4100;
                int maxWidth = 15000;
                String header = text(headers[colIndex]).toLowerCase(Locale.ROOT);
                if ("message".equals(header)) {
                    minWidth = 9000;
                    maxWidth = 20000;
                } else if ("title".equals(header) || "destination".equals(header)) {
                    minWidth = 6500;
                }
                sheet.setColumnWidth(colIndex, Math.max(minWidth, Math.min(maxWidth, width + 420)));
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to generate Excel export", ex);
        }
    }

    private void validateAdmin(Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedTravelAccessException("Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedTravelAccessException("User " + adminId + " is not an admin");
        }
    }

    private DestinationStatus parseDestinationStatus(String rawValue) {
        if (isAll(rawValue)) {
            return null;
        }

        try {
            return DestinationStatus.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private TravelPlanStatus parsePlanStatus(String rawValue) {
        if (isAll(rawValue)) {
            return null;
        }

        try {
            return TravelPlanStatus.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private FeedbackType parseFeedbackType(String rawValue) {
        if (isAll(rawValue)) {
            return null;
        }

        try {
            return FeedbackType.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private ProcessingStatus parseProcessingStatus(String rawValue) {
        if (isAll(rawValue)) {
            return null;
        }

        try {
            return ProcessingStatus.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private LocalDate parseLocalDate(String rawValue) {
        if (rawValue == null || rawValue.trim().isEmpty()) {
            return null;
        }

        try {
            return LocalDate.parse(rawValue.trim(), DATE_FMT);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private boolean isAll(String rawValue) {
        return rawValue == null || rawValue.trim().isEmpty() || "ALL".equalsIgnoreCase(rawValue.trim());
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private void addSectionHeader(Document document, String label) throws DocumentException {
        Font sectionFont = new Font(Font.HELVETICA, 10.5f, Font.BOLD, new Color(15, 23, 42));

        PdfPTable sectionTable = new PdfPTable(1);
        sectionTable.setWidthPercentage(100f);
        sectionTable.setSpacingBefore(0f);
        sectionTable.setSpacingAfter(6f);

        PdfPCell labelCell = new PdfPCell();
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setCellEvent(new SectionHeaderCellEvent(text(label), sectionFont));
        labelCell.setFixedHeight(24f);
        labelCell.setPadding(0f);
        sectionTable.addCell(labelCell);

        document.add(sectionTable);
    }

    private String buildHeaderSubtitle(String appliedFilters) {
        return textIfPresent(appliedFilters);
    }

    private String buildMetaLine(String appliedFilters) {
        String generated = "Generated on " + DATE_TIME_FMT.format(LocalDateTime.now());
        String filters = textIfPresent(appliedFilters);
        if (filters.isEmpty()) {
            return generated;
        }
        return generated + " | Applied filters: " + filters;
    }

    private String resolveAppliedFilters(String override, String... pairs) {
        String normalizedOverride = normalize(override);
        if (!normalizedOverride.isEmpty()) {
            return normalizedOverride;
        }

        List<String> entries = new ArrayList<>();
        for (int i = 0; i + 1 < pairs.length; i += 2) {
            String fieldName = textIfPresent(pairs[i]);
            String value = textIfPresent(pairs[i + 1]);
            if (fieldName.isEmpty() || value.isEmpty() || "-".equals(value)) {
                continue;
            }
            entries.add(fieldName + " = " + value);
        }

        return String.join(" | ", entries);
    }

    private String textIfPresent(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }

    private String[] row(String left, String right) {
        return new String[]{left, right};
    }

    private int resolutionRate(Long resolved, Long total) {
        long safeTotal = total == null ? 0L : total;
        if (safeTotal <= 0L) {
            return 0;
        }

        long safeResolved = resolved == null ? 0L : resolved;
        return (int) Math.round((safeResolved * 100.0d) / safeTotal);
    }

    private String ownerName(TravelPlan plan) {
        if (plan == null || plan.getOwner() == null) {
            return "-";
        }

        String firstName = text(plan.getOwner().getFirstName());
        String lastName = text(plan.getOwner().getLastName());
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isEmpty() ? "-" : fullName;
    }

    private String ownerName(TravelFeedback feedback) {
        if (feedback == null || feedback.getTravelPlan() == null) {
            return "-";
        }
        return ownerName(feedback.getTravelPlan());
    }

    private String enumText(Enum<?> value) {
        if (value == null) {
            return "-";
        }

        return humanizeEnum(value.name());
    }

    private String humanizeEnum(String raw) {
        String normalized = text(raw).toLowerCase(Locale.ROOT).replace('_', ' ');
        if (normalized.isEmpty()) {
            return "-";
        }

        String[] words = normalized.split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < words.length; index++) {
            String word = words[index];
            if (word.isEmpty()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(word.charAt(0)));
            if (word.length() > 1) {
                builder.append(word.substring(1));
            }
        }

        return builder.toString();
    }

    private String longText(Long value) {
        return value == null ? "0" : String.valueOf(value);
    }

    private String scoreText(BigDecimal value) {
        if (value == null) {
            return "0";
        }

        return value.stripTrailingZeros().toPlainString();
    }

    private String dateText(LocalDate value) {
        return value == null ? "-" : DATE_FMT.format(value);
    }

    private String dateTimeText(LocalDateTime value) {
        return value == null ? "-" : DATE_TIME_FMT.format(value);
    }

    private String text(Object value) {
        String normalized = value == null ? "" : String.valueOf(value).trim();
        return normalized.isEmpty() ? "-" : normalized;
    }

    private boolean isStatusLikeHeader(String header) {
        String normalized = text(header).toLowerCase(Locale.ROOT);
        return normalized.contains("status") || normalized.contains("urgency") || normalized.contains("safety") || normalized.equals("type");
    }

    private boolean isIdentityHighlightHeader(String header) {
        String normalized = text(header).toLowerCase(Locale.ROOT);
        return normalized.equals("plan") || normalized.equals("client") || normalized.equals("destination");
    }

    private Color semanticColorForValue(String value) {
        String normalized = text(value).toLowerCase(Locale.ROOT);

        if (normalized.contains("resolved")
                || normalized.contains("closed")
                || normalized.contains("approved")
                || normalized.contains("published")
                || normalized.contains("completed")
                || normalized.contains("valid")) {
            return new Color(5, 150, 105);
        }

        if (normalized.contains("pending")
                || normalized.contains("submitted")
                || normalized.contains("in progress")
                || normalized.contains("in preparation")
                || normalized.contains("scheduled")
                || normalized.contains("normal")) {
            return BRAND_ORANGE;
        }

        if (normalized.contains("incident")
                || normalized.contains("complaint")
                || normalized.contains("critical")
                || normalized.contains("high")
                || normalized.contains("rejected")
                || normalized.contains("invalid")) {
            return new Color(185, 28, 28);
        }

        return new Color(51, 65, 85);
    }

    private boolean isDateHeader(String header) {
        String normalized = text(header).toLowerCase(Locale.ROOT);
        return normalized.contains("date") || normalized.contains("created") || normalized.contains("updated");
    }

    private boolean isNumericHeader(String header) {
        String normalized = text(header).toLowerCase(Locale.ROOT);
        return normalized.equals("plan")
                || normalized.equals("pet")
                || normalized.contains("level")
                || normalized.contains("score")
                || normalized.contains("rate")
                || normalized.contains("total")
                || normalized.contains("count");
    }

    private boolean trySetDateCell(Cell cell, String value, CellStyle dateStyle, CellStyle dateTimeStyle) {
        String normalized = text(value);
        if ("-".equals(normalized)) {
            return false;
        }

        try {
            if (normalized.length() == 10) {
                LocalDate date = LocalDate.parse(normalized, DATE_FMT);
                cell.setCellValue(date);
                cell.setCellStyle(dateStyle);
                return true;
            }

            LocalDateTime dateTime = LocalDateTime.parse(normalized, DATE_TIME_FMT);
            cell.setCellValue(dateTime);
            cell.setCellStyle(dateTimeStyle);
            return true;
        } catch (DateTimeParseException ex) {
            return false;
        }
    }

    private boolean trySetNumericCell(Cell cell, String value, CellStyle integerStyle, CellStyle decimalStyle) {
        String normalized = text(value).replace("%", "").trim();
        if ("-".equals(normalized)) {
            return false;
        }

        try {
            BigDecimal numeric = new BigDecimal(normalized);
            cell.setCellValue(numeric.doubleValue());
            if (numeric.stripTrailingZeros().scale() <= 0) {
                cell.setCellStyle(integerStyle);
            } else {
                cell.setCellStyle(decimalStyle);
            }
            return true;
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private CellStyle semanticExcelStyle(
            String header,
            String value,
            CellStyle baseStyle,
            CellStyle good,
            CellStyle warn,
            CellStyle risk,
            boolean urgentIncidentRow
    ) {
        if (!isStatusLikeHeader(header) && !urgentIncidentRow) {
            return baseStyle;
        }

        String normalized = text(value).toLowerCase(Locale.ROOT);
        if (urgentIncidentRow) {
            return risk;
        }

        if (normalized.contains("resolved")
                || normalized.contains("closed")
                || normalized.contains("approved")
                || normalized.contains("published")
                || normalized.contains("completed")
                || normalized.contains("valid")) {
            return good;
        }

        if (normalized.contains("pending")
                || normalized.contains("submitted")
                || normalized.contains("in progress")
                || normalized.contains("in preparation")
                || normalized.contains("scheduled")
                || normalized.contains("normal")) {
            return warn;
        }

        if (normalized.contains("incident")
                || normalized.contains("complaint")
                || normalized.contains("critical")
                || normalized.contains("high")
                || normalized.contains("rejected")
                || normalized.contains("invalid")
                || normalized.contains("low")) {
            return risk;
        }

        return baseStyle;
    }

    private boolean isUrgentIncidentRow(String sheetName, String[] headers, String[] rowValues) {
        if (!"feedback".equalsIgnoreCase(sheetName)) {
            return false;
        }

        String type = valueByHeader("Type", headers, rowValues).toLowerCase(Locale.ROOT);
        String urgency = valueByHeader("Urgency", headers, rowValues).toLowerCase(Locale.ROOT);
        String status = valueByHeader("Status", headers, rowValues).toLowerCase(Locale.ROOT);

        boolean incidentLike = type.contains("incident") || type.contains("complaint");
        boolean urgent = urgency.contains(UrgencyLevel.HIGH.name().toLowerCase(Locale.ROOT))
                || urgency.contains(UrgencyLevel.CRITICAL.name().toLowerCase(Locale.ROOT));
        boolean open = status.contains("pending") || status.contains("in progress");

        return incidentLike && (urgent || open);
    }

    private String valueByHeader(String targetHeader, String[] headers, String[] rowValues) {
        for (int index = 0; index < headers.length; index++) {
            if (targetHeader.equalsIgnoreCase(text(headers[index]))) {
                return index < rowValues.length ? text(rowValues[index]) : "";
            }
        }
        return "";
    }

    private static class TopRoundedHeaderCellEvent implements PdfPCellEvent {
        private final Color fillColor;
        private final String title;
        private final String generatedLine;
        private final String subtitleLine;
        private final Font titleFont;
        private final Font generatedFont;
        private final Font subtitleFont;

        private TopRoundedHeaderCellEvent(
                Color fillColor,
                String title,
                String generatedLine,
                String subtitleLine,
                Font titleFont,
                Font generatedFont,
                Font subtitleFont
        ) {
            this.fillColor = fillColor;
            this.title = title;
            this.generatedLine = generatedLine;
            this.subtitleLine = subtitleLine;
            this.titleFont = titleFont;
            this.generatedFont = generatedFont;
            this.subtitleFont = subtitleFont;
        }

        @Override
        public void cellLayout(PdfPCell cell, Rectangle position, PdfContentByte[] canvases) {
            float left = position.getLeft();
            float bottom = position.getBottom();
            float width = position.getWidth();
            float top = position.getTop();

            PdfContentByte bgCanvas = canvases[PdfPTable.BACKGROUNDCANVAS];
            bgCanvas.saveState();
            bgCanvas.setColorFill(fillColor);
            bgCanvas.roundRectangle(left, bottom, width, position.getHeight(), 10f);
            bgCanvas.fill();

            bgCanvas.setColorFill(BRAND_ORANGE);
            bgCanvas.roundRectangle(left + 12f, top - 20f, 42f, 10f, 3f);
            bgCanvas.fill();
            bgCanvas.restoreState();

            PdfContentByte textCanvas = canvases[PdfPTable.TEXTCANVAS];
            ColumnText.showTextAligned(
                    textCanvas,
                    Element.ALIGN_LEFT,
                    new Phrase(textStatic(title), titleFont),
                    left + 12f,
                    top - 26f,
                    0f
            );
            ColumnText.showTextAligned(
                    textCanvas,
                    Element.ALIGN_LEFT,
                    new Phrase(textStatic(generatedLine), generatedFont),
                    left + 12f,
                    top - 40f,
                    0f
            );

            String subtitle = textStatic(subtitleLine);
            if (!"-".equals(subtitle)) {
                ColumnText.showTextAligned(
                        textCanvas,
                        Element.ALIGN_LEFT,
                        new Phrase(subtitle, subtitleFont),
                        left + 12f,
                        top - 52f,
                        0f
                );
            }
        }

        private static String textStatic(String value) {
            String normalized = value == null ? "" : value.trim();
            return normalized.isEmpty() ? "-" : normalized;
        }
    }

    private static class SectionHeaderCellEvent implements PdfPCellEvent {
        private final String label;
        private final Font labelFont;

        private SectionHeaderCellEvent(String label, Font labelFont) {
            this.label = label;
            this.labelFont = labelFont;
        }

        @Override
        public void cellLayout(PdfPCell cell, Rectangle position, PdfContentByte[] canvases) {
            PdfContentByte cb = canvases[PdfPTable.BACKGROUNDCANVAS];
            cb.saveState();

            float left = position.getLeft();
            float bottom = position.getBottom();
            float width = position.getWidth();
            float height = position.getHeight();

            cb.setColorFill(HEADER_BG);
            cb.roundRectangle(left, bottom, width, height, 6f);
            cb.fill();

            cb.setColorFill(BRAND_ORANGE);
            cb.roundRectangle(left + 1f, bottom + 1f, 4f, height - 2f, 2f);
            cb.fill();
            cb.restoreState();

            ColumnText.showTextAligned(
                    canvases[PdfPTable.TEXTCANVAS],
                    Element.ALIGN_LEFT,
                    new Phrase(textStatic(label), labelFont),
                    left + 12f,
                    position.getTop() - 16f,
                    0f
            );
        }

        private static String textStatic(String value) {
            String normalized = value == null ? "" : value.trim();
            return normalized.isEmpty() ? "-" : normalized;
        }
    }

    private static class TransitPdfPageEvent extends PdfPageEventHelper {
        private final String reportTitle;

        private TransitPdfPageEvent(String reportTitle) {
            this.reportTitle = reportTitle;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            Font footerFont = new Font(Font.HELVETICA, 8f, Font.NORMAL, new Color(100, 116, 139));

            ColumnText.showTextAligned(
                    writer.getDirectContent(),
                    Element.ALIGN_LEFT,
                    new Phrase("Elif Transit Export", footerFont),
                    document.left(),
                    document.bottom() - 12,
                    0
            );

            ColumnText.showTextAligned(
                    writer.getDirectContent(),
                    Element.ALIGN_CENTER,
                    new Phrase(textStatic(reportTitle), footerFont),
                    (document.left() + document.right()) / 2,
                    document.bottom() - 12,
                    0
            );

            ColumnText.showTextAligned(
                    writer.getDirectContent(),
                    Element.ALIGN_RIGHT,
                    new Phrase("Page " + writer.getPageNumber(), footerFont),
                    document.right(),
                    document.bottom() - 12,
                    0
            );
        }

        private static String textStatic(String value) {
            String normalized = value == null ? "" : value.trim();
            return normalized.isEmpty() ? "-" : normalized;
        }
    }

}
