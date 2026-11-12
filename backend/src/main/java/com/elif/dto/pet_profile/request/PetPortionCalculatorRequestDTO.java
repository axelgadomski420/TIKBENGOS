package com.elif.dto.pet_profile.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PetPortionCalculatorRequestDTO {

    @NotNull(message = "Food item ID is required")
    private Long foodItemId;

    @NotNull(message = "Target calories is required")
    private Integer targetCalories;
}
