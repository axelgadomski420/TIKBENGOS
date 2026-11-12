package com.elif.dto.pet_profile.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
public class PetMealPlanRequestDTO {

    @NotBlank(message = "Meal name is required")
    @Size(max = 60, message = "Meal name must be at most 60 characters")
    private String mealName;

    @NotNull(message = "Scheduled time is required")
    private LocalTime scheduledTime;

    @NotNull(message = "Target calories is required")
    @Min(value = 10, message = "Target calories must be at least 10")
    @Max(value = 2000, message = "Target calories must be at most 2000")
    private Integer targetCalories;

    @DecimalMin(value = "1.0", message = "Target portion must be at least 1 gram")
    private BigDecimal targetPortionGrams;

    @Size(max = 100, message = "Food type must be at most 100 characters")
    private String foodType;

    private Boolean reminderEnabled;

    @Min(value = 0, message = "Reminder minutes cannot be negative")
    @Max(value = 120, message = "Reminder minutes must be at most 120")
    private Integer reminderMinutesBefore;

    private Boolean active;
}
