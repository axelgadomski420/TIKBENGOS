package com.elif.dto.pet_transit.request;

import com.elif.entities.pet_transit.enums.ProcessingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminFeedbackResponseRequest {

    @NotBlank
    private String adminResponse;

    @NotNull
    private ProcessingStatus processingStatus;
}