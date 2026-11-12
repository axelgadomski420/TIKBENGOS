package com.elif.dto.pet_transit.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChecklistStatsResponse {

    private int totalItems;
    private int completedItems;
    private int totalMandatory;
    private int completedMandatory;
    private double completionPercentage;    // completedItems / totalItems * 100
    private double mandatoryCompletionPercentage; // completedMandatory / totalMandatory * 100
}