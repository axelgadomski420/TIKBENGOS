package com.elif.dto.pet_profile.request;

import com.elif.entities.pet_profile.enums.PetGender;
import com.elif.entities.pet_profile.enums.PetSpecies;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class AdminPetBulkUpdateRequestDTO {

    @NotEmpty(message = "At least one pet id is required")
    @Size(max = 500, message = "You can update up to 500 pets at once")
    private List<Long> petIds;

    private PetSpecies species;

    private PetGender gender;

    @Size(max = 100, message = "Breed must be at most 100 characters")
    private String breed;

    @AssertTrue(message = "Provide at least one field to update")
    public boolean hasAtLeastOneChange() {
        return species != null || gender != null || (breed != null && !breed.trim().isEmpty());
    }
}
