package com.elif.dto.marketplace;

import com.elif.entities.pet_profile.enums.PetSpecies;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private String name;
    private String description;
    private String category;
    private BigDecimal price;
    private Integer stock;
    private PetSpecies petSpecies;
    private String imageUrl;
    private Boolean active;
    private Double averageRating;
    private Long reviewCount;
}
