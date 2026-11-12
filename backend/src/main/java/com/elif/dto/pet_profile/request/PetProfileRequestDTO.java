package com.elif.dto.pet_profile.request;

import com.elif.entities.pet_profile.enums.PetGender;
import com.elif.entities.pet_profile.enums.PetSpecies;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;

@Data
public class PetProfileRequestDTO {

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must be at most 100 characters")
    private String name;

    @DecimalMin(value = "0.01", message = "Weight must be greater than 0")
    private BigDecimal weight;

    @NotNull(message = "Species is required")
    private PetSpecies species;

    @Size(max = 100, message = "Breed must be at most 100 characters")
    private String breed;

    @PastOrPresent(message = "Date of birth cannot be in the future")
    private LocalDate dateOfBirth;

    @Min(value = 0, message = "Age cannot be negative")
    @Max(value = 80, message = "Age must be realistic")
    private Integer age;

    @NotNull(message = "Gender is required")
    private PetGender gender;

    @Size(max = 500, message = "Photo URL must be at most 500 characters")
    @Pattern(
            regexp = "^(https?://).+$|^$",
            message = "Photo URL must start with http:// or https://"
    )
    private String photoUrl;

        @DecimalMin(value = "-90.0", inclusive = true, message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", inclusive = true, message = "Latitude must be between -90 and 90")
        private Double latitude;

        @DecimalMin(value = "-180.0", inclusive = true, message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", inclusive = true, message = "Longitude must be between -180 and 180")
        private Double longitude;

    @AssertTrue(message = "Age does not match dateOfBirth")
    public boolean isAgeConsistentWithDateOfBirth() {
        if (dateOfBirth == null || age == null) {
            return true;
        }
        return Period.between(dateOfBirth, LocalDate.now()).getYears() == age;
    }
}
