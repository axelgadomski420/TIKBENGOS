package com.elif.dto.pet_profile.response;

import com.elif.entities.pet_profile.enums.PetGender;
import com.elif.entities.pet_profile.enums.PetSpecies;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class PetProfileResponseDTO {
    private Long id;
    private Long userId;
    private String name;
    private BigDecimal weight;
    private PetSpecies species;
    private String breed;
    private LocalDate dateOfBirth;
    private String ageDisplay; // Human-readable: "3 months", "1 year 5 months", calculated from DOB
    private PetGender gender;
    private String photoUrl;
    private Double latitude;
    private Double longitude;
    private LocalDateTime locationUpdatedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
