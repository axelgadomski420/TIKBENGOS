package com.elif.dto.pet_profile.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealItemDTO {
    private String food;                // e.g., "30g high-quality kitten dry food"
    private Integer portionGrams;       // Weight of portion
    private Integer calories;           // Estimated calories for this portion
    private String protein;             // e.g., "8g"
    private String fat;                 // e.g., "4g"
    private String instructions;        // Optional prep instructions
}
