package com.elif.dto.pet_transit.response;

import com.elif.entities.pet_transit.enums.ChecklistCategory;
import com.elif.entities.pet_transit.enums.PriorityLevel;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class SafetyChecklistResponse {

    private Long id;
    private Long travelPlanId;
    private String title;
    private String taskCode;
    private ChecklistCategory category;
    private PriorityLevel priorityLevel;
    private Boolean mandatory;
    private Boolean completed;
    private LocalDate dueDate;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}