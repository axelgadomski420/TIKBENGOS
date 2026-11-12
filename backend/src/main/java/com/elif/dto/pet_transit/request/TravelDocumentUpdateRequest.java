package com.elif.dto.pet_transit.request;

import lombok.Data;

@Data
public class TravelDocumentUpdateRequest {
    private String documentNumber;
    private String holderName;
    private String issueDate;
    private String expiryDate;
    private String issuingOrganization;
    private String extractedText;
}
