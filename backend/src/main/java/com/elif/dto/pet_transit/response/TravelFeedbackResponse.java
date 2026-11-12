package com.elif.dto.pet_transit.response;

import com.elif.entities.pet_transit.enums.FeedbackType;
import com.elif.entities.pet_transit.enums.ProcessingStatus;
import com.elif.entities.pet_transit.enums.UrgencyLevel;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class TravelFeedbackResponse {

    private Long id;
    private Long travelPlanId;
    private String destinationTitle;        // from plan.destination.title
    private FeedbackType feedbackType;
    private Integer rating;
    private String title;
    private String message;
    private String incidentLocation;
    private BigDecimal aiSentimentScore;
    private UrgencyLevel urgencyLevel;
    private ProcessingStatus processingStatus;
    private String adminResponse;
    private String respondedByAdminName;    // firstName + " " + lastName
    private LocalDateTime respondedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}