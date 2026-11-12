package com.elif.dto.pet_profile.request;

import com.elif.entities.pet_profile.enums.PetActivityLevel;
import com.elif.entities.pet_profile.enums.PetNutritionGoal;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PetNutritionProfileRequestDTO {

    @NotNull(message = "Nutrition goal is required")
    private PetNutritionGoal goal;

    @NotNull(message = "Activity level is required")
    private PetActivityLevel activityLevel;

    private BigDecimal targetWeightKg;

    @NotNull(message = "Daily calorie target is required")
    @Min(value = 50, message = "Daily calorie target must be at least 50")
    @Max(value = 5000, message = "Daily calorie target must be at most 5000")
    private Integer dailyCalorieTarget;

    @NotNull(message = "Meals per day is required")
    @Min(value = 1, message = "Meals per day must be at least 1")
    @Max(value = 12, message = "Meals per day must be at most 12")
    private Integer mealsPerDay;

    @Size(max = 50, message = "Food preference must be at most 50 characters")
    private String foodPreference;

    @Size(max = 1000, message = "Allergies must be at most 1000 characters")
    private String allergies;

    @Size(max = 1000, message = "Forbidden ingredients must be at most 1000 characters")
    private String forbiddenIngredients;
}
