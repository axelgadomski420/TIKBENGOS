package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.request.TravelDocumentOcrUpdateRequest;
import com.elif.dto.pet_transit.request.TravelDocumentValidateRequest;
import com.elif.dto.pet_transit.response.TravelDocumentResponse;
import com.elif.entities.pet_transit.TravelDocument;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.pet_transit.enums.DocumentValidationStatus;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.exceptions.pet_transit.TravelDocumentNotFoundException;
import com.elif.exceptions.pet_transit.TravelPlanNotFoundException;
import com.elif.exceptions.pet_transit.UnauthorizedTravelAccessException;
import com.elif.repositories.pet_transit.TravelDocumentRepository;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import com.elif.repositories.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
@Transactional
public class TravelDocumentService {

    private final TravelDocumentRepository travelDocumentRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final UserRepository userRepository;
    private final ReadinessScoreService readinessScoreService;
    private final FileStorageService fileStorageService;

    public TravelDocumentResponse uploadDocument(Long planId,
                                                 Long ownerId,
                                                 MultipartFile file,
                                                 DocumentType documentType,
                                                 String documentNumber,
                                                 String holderName,
                                                 String issueDate,
                                                 String expiryDate,
                                                 String issuingOrganization) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "File is required and must not be empty.");
        }

        if (documentType == null) {
            throw new IllegalArgumentException(
                    "Document type is required.");
        }

        TravelPlan travelPlan = getPlanAndCheckOwnership(planId, ownerId);
        reopenRejectedPlanForClientUpdate(travelPlan);

        String fileUrl = fileStorageService.storeFile(file, "travel-documents");

        TravelDocument document = TravelDocument.builder()
                .travelPlan(travelPlan)
                .documentType(documentType)
                .fileUrl(fileUrl)
                .documentNumber(documentNumber)
                .holderName(holderName)
                .issueDate(parseDateSafely(issueDate))
                .expiryDate(parseDateSafely(expiryDate))
                .issuingOrganization(issuingOrganization)
                .validationStatus(DocumentValidationStatus.PENDING)
                .isOcrProcessed(false)
                .build();

        TravelDocument saved = travelDocumentRepository.save(document);
        readinessScoreService.recalculateAndSave(planId);
        return toResponse(saved);
    }

    public TravelDocumentResponse updateDocument(
            Long planId, Long docId, Long userId,
            String documentNumber, String holderName,
            String issueDateStr, String expiryDateStr,
            String issuingOrganization, String extractedText,
            MultipartFile file) {
        TravelDocument document = travelDocumentRepository.findById(docId)
                .orElseThrow(() -> new TravelDocumentNotFoundException(
                        "Document not found: " + docId));

        if (!document.getTravelPlan().getId().equals(planId)) {
            throw new IllegalArgumentException(
                    "Document does not belong to this travel plan.");
        }

        if (!document.getTravelPlan().getOwner().getId().equals(userId)) {
            throw new UnauthorizedTravelAccessException(
                    "You are not authorized to edit this document.");
        }

        TravelPlan travelPlan = document.getTravelPlan();
        reopenRejectedPlanForClientUpdate(travelPlan);

        if (file != null && !file.isEmpty()) {
            fileStorageService.deleteFile(document.getFileUrl());
            String newUrl = fileStorageService.storeFile(file, "travel-documents");
            document.setFileUrl(newUrl);

            document.setIsOcrProcessed(false);
            document.setExtractedText(null);
            document.setValidationStatus(DocumentValidationStatus.PENDING);
            document.setValidationComment(null);
            document.setValidatedAt(null);
            document.setValidatedByAdmin(null);
        }

        applyDocumentMetadataUpdate(
                document,
                documentNumber,
                holderName,
                issueDateStr,
                expiryDateStr,
                issuingOrganization,
                extractedText
        );

        TravelDocument updated = travelDocumentRepository.save(document);
        readinessScoreService.recalculateAndSave(planId);
        return toResponse(updated);
    }

    public TravelDocumentResponse updateAfterOcr(Long planId, Long docId, Long ownerId,
                                                 TravelDocumentOcrUpdateRequest req) {
        TravelDocument document = travelDocumentRepository.findById(docId)
                .orElseThrow(() -> new TravelDocumentNotFoundException(
                        "Document not found: " + docId));

        if (!document.getTravelPlan().getId().equals(planId)) {
            throw new IllegalArgumentException(
                    "Document does not belong to this travel plan.");
        }

        if (!document.getTravelPlan().getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedTravelAccessException(
                    "You are not authorized to edit this document.");
        }

        reopenRejectedPlanForClientUpdate(document.getTravelPlan());

        applyDocumentMetadataUpdate(
                document,
                req.getDocumentNumber(),
                req.getHolderName(),
                req.getIssueDate() == null ? null : req.getIssueDate().toString(),
                req.getExpiryDate() == null ? null : req.getExpiryDate().toString(),
                req.getIssuingOrganization(),
                req.getExtractedText()
        );

        document.setIsOcrProcessed(true);

        TravelDocument updated = travelDocumentRepository.save(document);
        readinessScoreService.recalculateAndSave(planId);
        return toResponse(updated);
    }

    public TravelDocumentResponse validateDocument(Long planId, Long docId, Long adminId,
                                                   TravelDocumentValidateRequest req) {
        TravelDocument document = getDocumentAndVerifyPlan(docId, planId);

        if (req.getValidationStatus() == DocumentValidationStatus.REJECTED) {
            throw new IllegalArgumentException(
                    "Use rejectDocument() for REJECTED status. validateDocument() is for non-rejected statuses only."
            );
        }

        User admin = getAdminUser(adminId);

        document.setValidationStatus(req.getValidationStatus());
        document.setValidatedAt(LocalDateTime.now());
        document.setValidatedByAdmin(admin);
        document.setValidationComment(req.getValidationComment());

        TravelDocument updated = travelDocumentRepository.save(document);
        readinessScoreService.recalculateAndSave(planId);

        return toResponse(updated);
    }

    public TravelDocumentResponse rejectDocument(Long planId, Long docId, Long adminId, String comment) {
        TravelDocument document = getDocumentAndVerifyPlan(docId, planId);
        User admin = getAdminUser(adminId);

        document.setValidationStatus(DocumentValidationStatus.REJECTED);
        document.setValidatedAt(LocalDateTime.now());
        document.setValidatedByAdmin(admin);
        document.setValidationComment(comment);

        TravelDocument updated = travelDocumentRepository.save(document);
        readinessScoreService.recalculateAndSave(planId);

        return toResponse(updated);
    }

    public List<TravelDocumentResponse> getDocumentsForPlan(Long planId, Long ownerId) {
        getPlanAndCheckOwnership(planId, ownerId);

        return travelDocumentRepository.findByTravelPlanId(planId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<TravelDocumentResponse> getDocumentsForPlanAsAdmin(Long planId, Long adminId) {
        getAdminUser(adminId);
        travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found: " + planId));

        return travelDocumentRepository.findByTravelPlanId(planId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public TravelDocumentResponse getDocumentById(Long planId, Long docId, Long ownerId) {
        getPlanAndCheckOwnership(planId, ownerId);
        TravelDocument document = getDocumentAndVerifyPlan(docId, planId);
        return toResponse(document);
    }

    public void deleteDocument(Long planId, Long docId, Long requesterId) {
        TravelDocument document = getDocumentAndCheckDeleteAccess(planId, docId, requesterId);

        fileStorageService.deleteFile(document.getFileUrl());
        travelDocumentRepository.delete(document);
        readinessScoreService.recalculateAndSave(planId);
    }

    private void applyDocumentMetadataUpdate(TravelDocument document,
                                             String documentNumber,
                                             String holderName,
                                             String issueDateStr,
                                             String expiryDateStr,
                                             String issuingOrganization,
                                             String extractedText) {
        if (documentNumber != null) {
            document.setDocumentNumber(documentNumber.trim());
        }
        if (holderName != null) {
            document.setHolderName(holderName.trim());
        }
        if (issuingOrganization != null) {
            document.setIssuingOrganization(issuingOrganization.trim());
        }
        if (extractedText != null) {
            document.setExtractedText(extractedText.trim());
        }

        LocalDate parsedIssueDate = parseDateSafely(issueDateStr);
        LocalDate parsedExpiryDate = parseDateSafely(expiryDateStr);

        if (parsedIssueDate != null && parsedExpiryDate != null
                && parsedIssueDate.isAfter(parsedExpiryDate)) {
            throw new IllegalArgumentException(
                    "Issue date must not be after expiry date.");
        }

        if (issueDateStr != null) {
            document.setIssueDate(parsedIssueDate);
        }
        if (expiryDateStr != null) {
            document.setExpiryDate(parsedExpiryDate);
        }
    }

    private TravelDocument getDocumentAndCheckDeleteAccess(Long planId, Long docId, Long requesterId) {
        TravelDocument document = travelDocumentRepository.findById(docId)
                .orElseThrow(() -> new TravelDocumentNotFoundException("Document not found: " + docId));

        if (!document.getTravelPlan().getId().equals(planId)) {
            throw new UnauthorizedTravelAccessException("Document does not belong to this plan");
        }

        boolean isOwner = document.getTravelPlan().getOwner().getId().equals(requesterId);

        boolean isAdmin = userRepository.findById(requesterId)
                .map(user -> user.getRole() == Role.ADMIN)
                .orElse(false);

        if (!isOwner && !isAdmin) {
            throw new UnauthorizedTravelAccessException(
                    "User " + requesterId + " is not allowed to delete this document"
            );
        }

        return document;
    }

    private TravelPlan getPlanAndCheckOwnership(Long planId, Long ownerId) {
        TravelPlan travelPlan = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found: " + planId));

        if (!travelPlan.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedTravelAccessException("User " + ownerId + " is not the owner of this plan");
        }

        return travelPlan;
    }

    private TravelDocument getDocumentAndVerifyPlan(Long docId, Long planId) {
        TravelDocument document = travelDocumentRepository.findById(docId)
                .orElseThrow(() -> new TravelDocumentNotFoundException("Document not found: " + docId));

        if (!document.getTravelPlan().getId().equals(planId)) {
            throw new UnauthorizedTravelAccessException("Document does not belong to this plan");
        }

        return document;
    }

    private User getAdminUser(Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedTravelAccessException("Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedTravelAccessException("User " + adminId + " is not an admin");
        }

        return admin;
    }

    private LocalDate parseDateSafely(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(dateStr.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(
                    "Invalid date format: '" + dateStr +
                            "'. Expected format: YYYY-MM-DD");
        }
    }

    private void reopenRejectedPlanForClientUpdate(TravelPlan travelPlan) {
        if (travelPlan.getStatus() != TravelPlanStatus.REJECTED) {
            return;
        }

        travelPlan.setStatus(TravelPlanStatus.IN_PREPARATION);
        travelPlan.setSubmittedAt(null);
        travelPlan.setReviewedAt(null);
        travelPlan.setReviewedByAdmin(null);
        travelPlan.setAdminDecisionComment(null);
        travelPlan.setAdminVisible(true);
        travelPlan.setAdminHiddenAt(null);
        travelPlan.setAdminHiddenBy(null);

        travelPlanRepository.save(travelPlan);
    }

    private TravelDocumentResponse toResponse(TravelDocument document) {
        String validatedByAdminName = document.getValidatedByAdmin() == null ? null :
                document.getValidatedByAdmin().getFirstName() + " " + document.getValidatedByAdmin().getLastName();

        return TravelDocumentResponse.builder()
                .id(document.getId())
                .travelPlanId(document.getTravelPlan().getId())
                .documentType(document.getDocumentType())
                .fileUrl(document.getFileUrl())
                .documentNumber(document.getDocumentNumber())
                .holderName(document.getHolderName())
                .issueDate(document.getIssueDate())
                .expiryDate(document.getExpiryDate())
                .issuingOrganization(document.getIssuingOrganization())
                .extractedText(document.getExtractedText())
                .isOcrProcessed(document.getIsOcrProcessed())
                .validationStatus(document.getValidationStatus())
                .validationComment(document.getValidationComment())
                .uploadedAt(document.getUploadedAt())
                .updatedAt(document.getUpdatedAt())
                .validatedAt(document.getValidatedAt())
                .validatedByAdminName(validatedByAdminName)
                .build();
    }
}
