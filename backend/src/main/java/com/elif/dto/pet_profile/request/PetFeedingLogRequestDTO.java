package com.elif.dto.pet_profile.request;

import com.elif.entities.pet_profile.enums.PetFeedingStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PetFeedingLogRequestDTO {

    @NotNull(message = "Feeding date and time is required")
    private LocalDateTime fedAt;

    @Size(max = 60, message = "Meal label must be at most 60 characters")
    private String mealLabel;

    @NotBlank(message = "Food name is required")
    @Size(max = 120, message = "Food name must be at most 120 characters")
    private String foodName;

    @NotNull(message = "Portion is required")
    @Min(value = 1, message = "Portion must be at least 1 gram")
    private BigDecimal portionGrams;

    @Min(value = 0, message = "Calories cannot be negative")
    @Max(value = 5000, message = "Calories must be at most 5000")
    private Integer caloriesActual;

    @Min(value = 0, message = "Protein cannot be negative")
    private BigDecimal proteinGrams;

    @Min(value = 0, message = "Fat cannot be negative")
    private BigDecimal fatGrams;

    @Min(value = 0, message = "Carbs cannot be negative")
    private BigDecimal carbsGrams;

    @NotNull(message = "Feeding status is required")
    private PetFeedingStatus status;

    @Size(max = 500, message = "Note must be at most 500 characters")
    private String note;

    @Size(max = 500, message = "Photo URL must be at most 500 characters")
    private String photoUrl;
}
