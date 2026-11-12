package com.elif.dto.service;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Data Transfer Object for ServiceAvailability entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceAvailabilityDTO {
    private Long id;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private Boolean isAvailable;
    private Long serviceId;
}
