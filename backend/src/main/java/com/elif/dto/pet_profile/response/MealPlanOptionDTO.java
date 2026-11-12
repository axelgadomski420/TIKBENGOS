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
public class MealPlanOptionDTO {
    private Integer optionNumber;           // 1, 2, etc.
    private String name;                    // e.g., "Balanced Mixed Diet"
    private String overview;                // Description of this plan
    private List<MealSectionDTO> sections;  // Breakfast, lunch, dinner components
    private Integer totalDailyCalories;     // Total calories across all meals
    private String dietaryApproach;         // e.g., "dry-food-primary", "mixed", "raw-based"
    private Integer proteinPercentage;
    private Integer fatPercentage;
    private Integer carbsPercentage;
    private List<String> highlights;        // Key benefits of this plan
}
