package com.elif.dto.marketplace;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReclamationDTO {
    private Long id;
    private Long userId;
    private Long orderId;
    private Long productId;
    private String title;
    private String description;
    private String type;
    private String status;
    private String responseMalek;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String image;
}