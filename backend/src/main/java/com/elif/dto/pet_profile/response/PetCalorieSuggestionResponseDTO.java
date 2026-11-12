package com.elif.dto.pet_profile.response;

import com.elif.entities.pet_profile.enums.PetActivityLevel;
import com.elif.entities.pet_profile.enums.PetNutritionGoal;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PetCalorieSuggestionResponseDTO {
    private Integer suggestedDailyCalories;
    private Integer restingEnergyRequirement;
    private PetActivityLevel activityLevel;
    private PetNutritionGoal goal;
    private String rationale;
}
