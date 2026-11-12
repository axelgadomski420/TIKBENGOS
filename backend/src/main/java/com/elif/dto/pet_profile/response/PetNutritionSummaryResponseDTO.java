package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PetNutritionSummaryResponseDTO {
    private Integer dailyCalorieTarget;
    private Integer todayCalories;
    private Integer remainingCalories;
    private Integer plannedMealsPerDay;
    private Long mealsLoggedToday;
    private Long mealsCompletedToday;
    private Integer adherencePercent;

    // Macro totals for today
    private BigDecimal todayProteinGrams;
    private BigDecimal todayFatGrams;
    private BigDecimal todayCarbsGrams;

    // Water intake
    private Integer todayWaterMl;
    private Integer dailyWaterTargetMl;
    private Integer waterAdherencePercent;

    // Weight progress
    private BigDecimal currentWeightKg;
    private BigDecimal targetWeightKg;
    private BigDecimal weightChangeKg;   // vs previous log entry
}
