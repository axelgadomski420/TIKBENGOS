package com.elif.dto.service;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Data Transfer Object for ServiceBooking entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceBookingDTO {
    private Long id;
    private Long userId;
    private String petName;
    private String petType;
    private String petBreed;
    private Integer petAge;
    private Long serviceId;
    private List<Long> selectedOptionIds;
    private Long availabilityId;
    private LocalDateTime bookingDate;
    @Builder.Default
    private String status = "PENDING";
}
