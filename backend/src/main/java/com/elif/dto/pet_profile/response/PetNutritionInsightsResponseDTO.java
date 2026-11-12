package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@Builder
public class PetNutritionInsightsResponseDTO {
    private Integer periodDays;
    private Integer dailyCalorieTarget;
    private Integer averageDailyCalories;
    private Integer calorieTargetDelta;
    private Integer adherencePercent;
    private Integer completionRatePercent;
    private Integer streakDays;
    private Integer longestStreakDays;
    private Map<String, Long> statusBreakdown;
    private List<PetNutritionTrendPointDTO> calorieTrend;
    private List<String> recommendations;
}
