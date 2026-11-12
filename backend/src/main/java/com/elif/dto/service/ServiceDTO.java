package com.elif.dto.service;

import java.util.List;
import lombok.*;

/**
 * Data Transfer Object for Service entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceDTO {
    private Long id;
    private String name;
    private String description;
    private Double price;
    private Integer duration;
    private String status;
    private String imageUrl;
    private Long categoryId;
    private Long providerId;
    private List<ServiceOptionDTO> options;

    // --- VETERINARY ---
    private String clinicName;
    private String consultationType;
    private Boolean emergencyAvailable;
    private Boolean requiresAppointment;

    // --- GROOMING ---
    private String petSize;
    private Boolean includesBath;
    private Boolean includesHaircut;
    private String productsUsed;

    // --- TRAINING ---
    private String trainingType;
    private Integer sessionsCount;
    private Integer sessionDuration;
    private Boolean groupTraining;

    // --- BOARDING ---
    private Integer capacity;
    private Boolean overnight;
    private Boolean hasOutdoorSpace;
    private Integer maxStayDays;

    // --- HOTEL ---
    private String roomType;
    private Boolean hasCameraAccess;
    private Boolean includesFood;
    private Integer numberOfStaff;

    // --- WALKING ---
    private Integer durationPerWalk;
    private Boolean groupWalk;
    private Integer maxDogs;
    private String areaCovered;
}
