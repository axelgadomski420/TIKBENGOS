package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Builder
public class PetMealPlanResponseDTO {
    private Long id;
    private Long petId;
    private String mealName;
    private LocalTime scheduledTime;
    private Integer targetCalories;
    private BigDecimal targetPortionGrams;
    private String foodType;
    private Boolean reminderEnabled;
    private Integer reminderMinutesBefore;
    private Boolean active;
    private Boolean loggedToday; // has this meal been logged today?
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
