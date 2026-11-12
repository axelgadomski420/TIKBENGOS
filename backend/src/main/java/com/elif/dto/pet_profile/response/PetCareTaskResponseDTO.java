package com.elif.dto.pet_profile.response;

import com.elif.entities.pet_profile.enums.PetTaskRecurrence;
import com.elif.entities.pet_profile.enums.PetTaskStatus;
import com.elif.entities.pet_profile.enums.PetTaskUrgency;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class PetCareTaskResponseDTO {
    private Long id;
    private Long petId;
    private String title;
    private String category;
    private PetTaskUrgency urgency;
    private PetTaskStatus status;
    private LocalDate dueDate;
    private String notes;
    private PetTaskRecurrence recurrence;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
