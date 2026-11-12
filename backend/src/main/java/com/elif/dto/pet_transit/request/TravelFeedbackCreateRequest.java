package com.elif.dto.pet_transit.request;

import com.elif.entities.pet_transit.enums.FeedbackType;
import com.elif.entities.pet_transit.enums.UrgencyLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TravelFeedbackCreateRequest {

    @NotNull
    private Long travelPlanId;

    @NotNull
    private FeedbackType feedbackType;

    @Min(1) @Max(5)
    private Integer rating;

    private String title;
    private String message;
    private String incidentLocation;
    private UrgencyLevel urgencyLevel;
}