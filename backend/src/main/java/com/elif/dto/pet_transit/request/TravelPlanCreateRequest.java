package com.elif.dto.pet_transit.request;

import com.elif.entities.pet_transit.enums.CurrencyCode;
import com.elif.entities.pet_transit.enums.TransportType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class TravelPlanCreateRequest {

    @NotNull
    @Positive
    private Long petId;

    @NotNull
    private Long destinationId;

    @NotBlank
    private String origin;

    @NotNull
    private TransportType transportType;

    @NotNull
    private LocalDate travelDate;

    private LocalDate returnDate;

    @DecimalMin(value = "0.0", inclusive = true, message = "Estimated travel hours must be greater than or equal to 0")
    private BigDecimal estimatedTravelHours;

    @DecimalMin(value = "0.0", inclusive = true, message = "Estimated travel cost must be greater than or equal to 0")
    private BigDecimal estimatedTravelCost;

    private CurrencyCode currency;

    @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal animalWeight;

    @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal cageLength;

    @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal cageWidth;

    @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal cageHeight;

    @Positive
    private Integer hydrationIntervalMinutes;

    @Min(0)
    private Integer requiredStops;
}
