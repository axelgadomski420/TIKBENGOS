package com.elif.controllers.pet_transit;

import com.elif.services.pet_transit.TransitExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/v1/transit/export")
@RequiredArgsConstructor
public class TransitExportController {

    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyyMMdd-HHmm");

    private final TransitExportService transitExportService;

    @GetMapping(value = "/overview/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportOverviewPdf(@RequestHeader("X-User-Id") Long adminId) {
        byte[] payload = transitExportService.exportOverviewPdf(adminId);
        return pdfResponse(payload, fileName("transit-overview-summary", "pdf"));
    }

    @GetMapping(value = "/overview/excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportOverviewExcel(@RequestHeader("X-User-Id") Long adminId) {
        byte[] payload = transitExportService.exportOverviewExcel(adminId);
        return excelResponse(payload, fileName("transit-overview-summary", "xlsx"));
    }

    @GetMapping(value = "/destinations/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportDestinationsPdf(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String appliedFilters
    ) {
        byte[] payload = transitExportService.exportDestinationsPdf(adminId, status, search, appliedFilters);
        return pdfResponse(payload, fileName("transit-destinations", "pdf"));
    }

    @GetMapping(value = "/destinations/excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportDestinationsExcel(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String appliedFilters
    ) {
        byte[] payload = transitExportService.exportDestinationsExcel(adminId, status, search, appliedFilters);
        return excelResponse(payload, fileName("transit-destinations", "xlsx"));
    }

    @GetMapping(value = "/travel-plans/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportTravelPlansPdf(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate travelDate,
            @RequestParam(required = false) String appliedFilters
    ) {
        byte[] payload = transitExportService.exportTravelPlansPdf(
                adminId,
                status,
                search,
            travelDate != null ? travelDate.toString() : null,
            appliedFilters
        );
        return pdfResponse(payload, fileName("transit-travel-plans", "pdf"));
    }

    @GetMapping(value = "/travel-plans/excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportTravelPlansExcel(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate travelDate,
            @RequestParam(required = false) String appliedFilters
    ) {
        byte[] payload = transitExportService.exportTravelPlansExcel(
                adminId,
                status,
                search,
            travelDate != null ? travelDate.toString() : null,
            appliedFilters
        );
        return excelResponse(payload, fileName("transit-travel-plans", "xlsx"));
    }

    @GetMapping(value = "/feedback/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportFeedbackPdf(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String appliedFilters
    ) {
        byte[] payload = transitExportService.exportFeedbackPdf(adminId, type, status, search, appliedFilters);
        return pdfResponse(payload, fileName("transit-feedback", "pdf"));
    }

    @GetMapping(value = "/feedback/excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportFeedbackExcel(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String appliedFilters
    ) {
        byte[] payload = transitExportService.exportFeedbackExcel(adminId, type, status, search, appliedFilters);
        return excelResponse(payload, fileName("transit-feedback", "xlsx"));
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] payload, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(filename))
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(payload.length)
                .body(payload);
    }

    private ResponseEntity<byte[]> excelResponse(byte[] payload, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"export.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(payload.length)
                .body(payload);
    }

    private String fileName(String prefix, String extension) {
        return prefix + "-" + TS_FMT.format(LocalDateTime.now()) + "." + extension;
    }

    private String contentDisposition(String filename) {
        return ContentDisposition.attachment().filename(filename).build().toString();
    }
}
