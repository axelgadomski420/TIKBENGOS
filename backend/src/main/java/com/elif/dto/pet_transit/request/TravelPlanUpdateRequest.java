package com.elif.dto.pet_transit.request;

import com.elif.entities.pet_transit.enums.CurrencyCode;
import com.elif.entities.pet_transit.enums.TransportType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class TravelPlanUpdateRequest {

    @NotNull
    @Positive
    private Long petId;

    private String origin;
    private TransportType transportType;
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
