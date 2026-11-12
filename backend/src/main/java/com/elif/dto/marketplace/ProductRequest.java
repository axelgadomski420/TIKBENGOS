package com.elif.dto.marketplace;

import com.elif.entities.pet_profile.enums.PetSpecies;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {
    private String name;
    private String description;
    private String category;
    private BigDecimal price;
    private Integer stock;
    private PetSpecies petSpecies;
    private MultipartFile imageFile;
    private Boolean active;
}
