package com.elif.dto.pet_profile.request;

import com.elif.entities.pet_profile.enums.PetTaskRecurrence;
import com.elif.entities.pet_profile.enums.PetTaskStatus;
import com.elif.entities.pet_profile.enums.PetTaskUrgency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PetCareTaskRequestDTO {

    @NotBlank(message = "Task title is required")
    @Size(max = 90, message = "Task title must be at most 90 characters")
    private String title;

    @NotBlank(message = "Task category is required")
    @Size(max = 50, message = "Task category must be at most 50 characters")
    private String category;

    @NotNull(message = "Task urgency is required")
    private PetTaskUrgency urgency;

    @NotNull(message = "Task status is required")
    private PetTaskStatus status;

    private LocalDate dueDate;

    @Size(max = 260, message = "Task notes must be at most 260 characters")
    private String notes;

    @NotNull(message = "Task recurrence is required")
    private PetTaskRecurrence recurrence;
}
