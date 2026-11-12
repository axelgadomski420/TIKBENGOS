package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class PetHealthRecordResponseDTO {
    private Long id;
    private Long petId;
    private LocalDate recordDate;
    private String visitType;
    private String veterinarian;
    private String clinicName;
    private String bloodType;
    private String spayedNeutered;
    private String allergies;
    private String chronicConditions;
    private String previousOperations;
    private String vaccinationHistory;
    private String specialDiet;
    private String parasitePrevention;
    private String emergencyInstructions;
    private String diagnosis;
    private String treatment;
    private String medications;
    private String notes;
    private LocalDate nextVisitDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
