package com.elif.dto.pet_profile.response;

import com.elif.entities.pet_profile.enums.PetActivityLevel;
import com.elif.entities.pet_profile.enums.PetNutritionGoal;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class PetNutritionProfileResponseDTO {
    private Long id;
    private Long petId;
    private PetNutritionGoal goal;
    private PetActivityLevel activityLevel;
    private BigDecimal targetWeightKg;
    private Integer dailyCalorieTarget;
    private Integer mealsPerDay;
    private String foodPreference;
    private String allergies;
    private String forbiddenIngredients;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
