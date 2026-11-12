package com.elif.dto.pet_profile.response;

import com.elif.entities.pet_profile.enums.PetGender;
import com.elif.entities.pet_profile.enums.PetSpecies;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class PetPhotoProfileAnalysisResponseDTO {
    private PetSpecies species;
    private String breed;
    private PetGender gender;
    private String suggestedName;
    private Integer estimatedAgeMonths;
    private BigDecimal estimatedWeightKg;
    private Integer confidence;
    private String summary;
    private List<String> detectedTraits;
    private List<String> notes;
    private String disclaimer;
    private String sourceModel;
}
