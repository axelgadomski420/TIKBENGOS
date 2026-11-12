package com.elif.dto.pet_transit.response;

import com.elif.entities.pet_transit.enums.CurrencyCode;
import com.elif.entities.pet_transit.enums.SafetyStatus;
import com.elif.entities.pet_transit.enums.TransportType;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class TravelPlanResponse {

    private Long id;

    // owner info
    private Long ownerId;
    private String ownerName;           // firstName + " " + lastName

    // pet (external module)
    private Long petId;

    // destination info
    private Long destinationId;
    private String destinationTitle;
    private String destinationCountry;

    // travel info
    private String origin;
    private TransportType transportType;
    private LocalDate travelDate;
    private LocalDate returnDate;
    private BigDecimal estimatedTravelHours;
    private BigDecimal estimatedTravelCost;
    private CurrencyCode currency;

    // animal / cage
    private BigDecimal animalWeight;
    private BigDecimal cageLength;
    private BigDecimal cageWidth;
    private BigDecimal cageHeight;
    private Integer hydrationIntervalMinutes;
    private Integer requiredStops;

    // scores & status
    private BigDecimal readinessScore;
    private SafetyStatus safetyStatus;
    private TravelPlanStatus status;
    private Boolean hasFeedback;

    // admin
    private String adminDecisionComment;
    private String reviewedByAdminName;  // firstName + " " + lastName
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
