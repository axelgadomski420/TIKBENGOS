package com.elif.dto.pet_transit.request;

import com.elif.entities.pet_transit.enums.ChecklistCategory;
import com.elif.entities.pet_transit.enums.PriorityLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class SafetyChecklistCreateRequest {

    @NotNull
    private Long travelPlanId;

    @NotBlank
    private String title;

    @Size(max = 80)
    private String taskCode;

    @NotNull
    private ChecklistCategory category;

    @NotNull
    private PriorityLevel priorityLevel;

    @NotNull
    private Boolean mandatory;

    private LocalDate dueDate;
}