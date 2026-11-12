package com.elif.dto.pet_transit.response;

import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.pet_transit.enums.DocumentValidationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class TravelDocumentResponse {

    private Long id;
    private Long travelPlanId;
    private DocumentType documentType;
    private String fileUrl;
    private String documentNumber;
    private String holderName;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    private String issuingOrganization;
    private String extractedText;
    private Boolean isOcrProcessed;
    private DocumentValidationStatus validationStatus;
    private String validationComment;
    private LocalDateTime uploadedAt;
    private LocalDateTime updatedAt;
    private LocalDateTime validatedAt;
    private String validatedByAdminName;    // firstName + " " + lastName
}