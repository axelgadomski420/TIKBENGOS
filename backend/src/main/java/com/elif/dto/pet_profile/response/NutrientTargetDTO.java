package com.elif.dto.pet_profile.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutrientTargetDTO {
    private String proteinPercent;      // e.g., "35%"
    private String fatPercent;          // e.g., "20%"
    private String carbsPercent;        // e.g., "45%"
    private Integer proteinGrams;       // Calculated based on daily calories
    private Integer fatGrams;
    private Integer carbsGrams;
    private String notes;               // e.g., "High protein formula for active dogs"
}
