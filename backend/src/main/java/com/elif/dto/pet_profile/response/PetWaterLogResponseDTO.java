package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class PetWaterLogResponseDTO {
    private Long id;
    private Long petId;
    private LocalDate loggedDate;
    private Integer amountMl;
    private String note;
    private LocalDateTime createdAt;
}
