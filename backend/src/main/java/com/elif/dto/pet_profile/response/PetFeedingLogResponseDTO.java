package com.elif.dto.pet_profile.response;

import com.elif.entities.pet_profile.enums.PetFeedingStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class PetFeedingLogResponseDTO {
    private Long id;
    private Long petId;
    private LocalDateTime fedAt;
    private String mealLabel;
    private String foodName;
    private BigDecimal portionGrams;
    private Integer caloriesActual;
    private BigDecimal proteinGrams;
    private BigDecimal fatGrams;
    private BigDecimal carbsGrams;
    private PetFeedingStatus status;
    private String note;
    private String photoUrl;
    private LocalDateTime createdAt;
}
