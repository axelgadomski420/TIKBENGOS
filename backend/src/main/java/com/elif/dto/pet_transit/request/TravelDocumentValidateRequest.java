package com.elif.dto.pet_transit.request;

import com.elif.entities.pet_transit.enums.DocumentValidationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TravelDocumentValidateRequest {

    @NotNull
    private DocumentValidationStatus validationStatus;

    private String validationComment;
}