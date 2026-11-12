package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class PetNutritionTrendPointDTO {
    private LocalDate date;
    private Integer calories;
    private Integer target;
    private Long meals;
    private Integer adherencePercent;
}
