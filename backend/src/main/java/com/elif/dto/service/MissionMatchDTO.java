package com.elif.dto.service;

import lombok.*;

/**
 * Représente une mission (service) avec son score de matching par rapport au CV.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MissionMatchDTO {
    private Long serviceId;
    private String serviceName;
    private String category;
    private int matchScore; // 0 à 100
}
