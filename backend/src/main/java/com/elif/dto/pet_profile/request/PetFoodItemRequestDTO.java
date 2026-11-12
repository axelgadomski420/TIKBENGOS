package com.elif.dto.pet_profile.request;

import com.elif.entities.pet_profile.enums.PetSpecies;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PetFoodItemRequestDTO {

    @NotBlank(message = "Food name is required")
    @Size(max = 150, message = "Food name must be at most 150 characters")
    private String name;

    @Size(max = 100, message = "Brand must be at most 100 characters")
    private String brand;

    private PetSpecies species;

    @Size(max = 50, message = "Food type must be at most 50 characters")
    private String foodType;

    @NotNull(message = "Calories per 100g is required")
    @Min(value = 1, message = "Calories per 100g must be at least 1")
    @Max(value = 1000, message = "Calories per 100g must be at most 1000")
    private Integer caloriesPer100g;

    @DecimalMin(value = "0.0", message = "Protein cannot be negative")
    private BigDecimal proteinPer100g;

    @DecimalMin(value = "0.0", message = "Fat cannot be negative")
    private BigDecimal fatPer100g;

    @DecimalMin(value = "0.0", message = "Carbs cannot be negative")
    private BigDecimal carbsPer100g;

    @DecimalMin(value = "0.0", message = "Fiber cannot be negative")
    private BigDecimal fiberPer100g;

    @Size(max = 1000, message = "Ingredients must be at most 1000 characters")
    private String ingredients;
}
