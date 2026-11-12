package com.elif.dto.pet_transit.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class TravelDocumentOcrUpdateRequest {

    private String extractedText;
    private String documentNumber;
    private String holderName;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    private String issuingOrganization;
}