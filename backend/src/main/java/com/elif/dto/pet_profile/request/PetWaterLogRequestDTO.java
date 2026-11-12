package com.elif.dto.pet_profile.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PetWaterLogRequestDTO {

    @NotNull(message = "Logged date is required")
    private LocalDate loggedDate;

    @NotNull(message = "Amount is required")
    @Min(value = 1, message = "Amount must be at least 1 ml")
    @Max(value = 10000, message = "Amount must be at most 10000 ml")
    private Integer amountMl;

    @Size(max = 300, message = "Note must be at most 300 characters")
    private String note;
}
