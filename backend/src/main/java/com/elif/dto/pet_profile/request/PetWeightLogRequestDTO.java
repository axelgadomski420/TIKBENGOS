package com.elif.dto.pet_profile.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PetWeightLogRequestDTO {

    @NotNull(message = "Logged date is required")
    private LocalDate loggedDate;

    @NotNull(message = "Weight is required")
    @DecimalMin(value = "0.1", message = "Weight must be at least 0.1 kg")
    private BigDecimal weightKg;

    @Size(max = 300, message = "Note must be at most 300 characters")
    private String note;
}
