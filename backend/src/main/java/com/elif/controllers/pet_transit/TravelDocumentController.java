package com.elif.controllers.pet_transit;

import com.elif.dto.pet_transit.request.TravelDocumentOcrUpdateRequest;
import com.elif.dto.pet_transit.request.TravelDocumentValidateRequest;
import com.elif.dto.pet_transit.response.OcrResultResponse;
import com.elif.dto.pet_transit.response.TravelDocumentResponse;
import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.services.pet_transit.OcrService;
import com.elif.services.pet_transit.TravelDocumentService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/travel-plans/{planId}/documents")
@AllArgsConstructor
public class TravelDocumentController {

    private final TravelDocumentService travelDocumentService;
    private final OcrService ocrService;

    @GetMapping
    public List<TravelDocumentResponse> getDocumentsForPlan(
            @PathVariable Long planId,
            @RequestHeader("X-User-Id") Long userId) {
        return travelDocumentService.getDocumentsForPlan(planId, userId);
    }

    @GetMapping("/admin")
    public List<TravelDocumentResponse> getDocumentsForPlanAsAdmin(
            @PathVariable Long planId,
            @RequestHeader("X-User-Id") Long adminId) {
        return travelDocumentService.getDocumentsForPlanAsAdmin(planId, adminId);
    }

    @GetMapping("/{docId}")
    public TravelDocumentResponse getDocumentById(
            @PathVariable Long planId,
            @PathVariable Long docId,
            @RequestHeader("X-User-Id") Long userId) {
        return travelDocumentService.getDocumentById(planId, docId, userId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public TravelDocumentResponse uploadDocument(
            @PathVariable Long planId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") DocumentType documentType,
            @RequestParam(required = false) String documentNumber,
            @RequestParam(required = false) String holderName,
            @RequestParam(required = false) String issueDate,
            @RequestParam(required = false) String expiryDate,
            @RequestParam(required = false) String issuingOrganization) {
        return travelDocumentService.uploadDocument(
                planId,
                userId,
                file,
                documentType,
                documentNumber,
                holderName,
                issueDate,
                expiryDate,
                issuingOrganization
        );
    }

    @PutMapping(
            value = "/{docId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public TravelDocumentResponse updateDocument(
            @PathVariable Long planId,
            @PathVariable Long docId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) String documentNumber,
            @RequestParam(required = false) String holderName,
            @RequestParam(required = false) String issueDate,
            @RequestParam(required = false) String expiryDate,
            @RequestParam(required = false) String issuingOrganization,
            @RequestParam(required = false) String extractedText,
            @RequestParam(required = false) MultipartFile file) {

        return travelDocumentService.updateDocument(
                planId, docId, userId,
                documentNumber, holderName,
                issueDate, expiryDate,
                issuingOrganization, extractedText,
                file);
    }

    @PutMapping("/{docId}/ocr")
    public TravelDocumentResponse updateAfterOcr(
            @PathVariable Long planId,
            @PathVariable Long docId,
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody TravelDocumentOcrUpdateRequest request) {
        return travelDocumentService.updateAfterOcr(planId, docId, userId, request);
    }

    @PostMapping("/ocr-analyze")
    public ResponseEntity<OcrResultResponse>
        analyzeDocumentOcr(
            @PathVariable Long planId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "documentType",
                          required = false,
                          defaultValue = "UNKNOWN")
            String documentType,
            @RequestHeader("X-User-Id") Long userId) {

        OcrResultResponse result =
            ocrService.analyzeDocument(file, documentType);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{docId}/validate")
    public TravelDocumentResponse validateDocument(
            @PathVariable Long planId,
            @PathVariable Long docId,
            @RequestHeader("X-User-Id") Long adminId,
            @Valid @RequestBody TravelDocumentValidateRequest request) {
        return travelDocumentService.validateDocument(planId, docId, adminId, request);
    }

    @PostMapping("/{docId}/reject")
    public TravelDocumentResponse rejectDocument(
            @PathVariable Long planId,
            @PathVariable Long docId,
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String comment) {
        return travelDocumentService.rejectDocument(planId, docId, adminId, comment);
    }

    @DeleteMapping("/{docId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(
            @PathVariable Long planId,
            @PathVariable Long docId,
            @RequestHeader("X-User-Id") Long requesterId) {
        travelDocumentService.deleteDocument(planId, docId, requesterId);
    }
}
