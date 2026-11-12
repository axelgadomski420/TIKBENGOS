package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Smart portion calculator result.
 */
@Getter
@Builder
public class PetPortionCalculatorResponseDTO {
    private BigDecimal suggestedPortionGrams;
    private Integer estimatedCalories;
    private BigDecimal estimatedProteinGrams;
    private BigDecimal estimatedFatGrams;
    private BigDecimal estimatedCarbsGrams;
    private String rationale;
}
