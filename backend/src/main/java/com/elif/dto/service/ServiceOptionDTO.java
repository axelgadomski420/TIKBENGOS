package com.elif.dto.service;

import lombok.*;

/**
 * Data Transfer Object for ServiceOption entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceOptionDTO {
    private Long id;
    private String name;
    private Double price;
    private Long serviceId;
}
