package com.elif.dto.events.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WellnessRequest {

    @NotNull(message = "Event ID is required")
    private Long eventId;

    private String petName;
    private String petBreed;

    @Min(value = 0, message = "Age must be positive")
    private Integer petAgeMonths;

    private String petTemperament;
    private Boolean isVaccinated;
    private Boolean hasLicense;
    private String additionalInfo;
}