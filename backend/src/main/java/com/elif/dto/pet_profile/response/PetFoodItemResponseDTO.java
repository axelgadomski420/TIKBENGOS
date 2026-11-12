package com.elif.dto.pet_profile.response;

import com.elif.entities.pet_profile.enums.PetSpecies;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PetFoodItemResponseDTO {
    private Long id;
    private String name;
    private String brand;
    private PetSpecies species;
    private String foodType;
    private Integer caloriesPer100g;
    private BigDecimal proteinPer100g;
    private BigDecimal fatPer100g;
    private BigDecimal carbsPer100g;
    private BigDecimal fiberPer100g;
    private String ingredients;
    private Boolean isSystemFood;
}
