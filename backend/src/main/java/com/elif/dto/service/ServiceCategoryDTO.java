package com.elif.dto.service;

import lombok.*;

/**
 * Data Transfer Object for ServiceCategory entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceCategoryDTO {
    private Long id;
    private String name;
    private String description;
}
