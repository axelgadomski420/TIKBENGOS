package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class PetWeightLogResponseDTO {
    private Long id;
    private Long petId;
    private LocalDate loggedDate;
    private BigDecimal weightKg;
    private BigDecimal changeKg;   // delta vs previous entry (null for first entry)
    private String note;
    private LocalDateTime createdAt;
}
