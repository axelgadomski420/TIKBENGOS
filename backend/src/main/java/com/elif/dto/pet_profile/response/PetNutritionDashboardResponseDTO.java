package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

/**
 * Comprehensive nutrition dashboard with everything needed for a rich UI.
 */
@Getter
@Builder
public class PetNutritionDashboardResponseDTO {
    // Today's summary
    private Integer todayCalories;
    private Integer dailyCalorieTarget;
    private Integer remainingCalories;
    private Integer adherencePercent;
    
    // Macros
    private BigDecimal todayProteinGrams;
    private BigDecimal todayFatGrams;
    private BigDecimal todayCarbsGrams;
    
    // Hydration
    private Integer todayWaterMl;
    private Integer dailyWaterTargetMl;
    private Integer waterAdherencePercent;
    
    // Weight
    private BigDecimal currentWeightKg;
    private BigDecimal targetWeightKg;
    private BigDecimal weightChangeKg;
    
    // Meals
    private Integer mealsLoggedToday;
    private Integer plannedMealsPerDay;
    private Integer mealsCompletedToday;
    
    // Score
    private Integer nutritionScore; // 0-100
    private String nutritionGrade; // A+, A, B+, B, C, D, F
    private String scoreFeedback;
    
    // Meal plan
    private List<PetMealPlanResponseDTO> mealPlan;
    
    // Recent logs
    private List<PetFeedingLogResponseDTO> recentLogs;
    
    // Quick insights
    private String calorieStatus; // "on_track", "under", "over"
    private String waterStatus; // "good", "low", "high"
    private String weightTrend; // "up", "down", "stable"
    private Integer currentStreak;
    private List<String> quickTips;
}
