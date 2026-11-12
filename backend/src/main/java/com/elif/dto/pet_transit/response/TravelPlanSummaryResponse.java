package com.elif.dto.pet_transit.response;

import com.elif.entities.pet_transit.enums.SafetyStatus;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class TravelPlanSummaryResponse {

    private Long id;
    private String destinationTitle;
    private String destinationCountry;
    private LocalDate travelDate;
    private TravelPlanStatus status;
    private Boolean hasFeedback;
    private BigDecimal readinessScore;
    private SafetyStatus safetyStatus;
    private LocalDateTime createdAt;
}