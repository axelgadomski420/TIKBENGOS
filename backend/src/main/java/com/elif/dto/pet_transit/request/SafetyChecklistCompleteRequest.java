package com.elif.dto.pet_transit.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SafetyChecklistCompleteRequest {
    @NotNull
    private Boolean completed;
}