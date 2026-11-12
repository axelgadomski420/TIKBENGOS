package com.elif.dto.service;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceReviewDTO {
    private Long id;
    private Long serviceId;
    private Long userId;
    private String userFirstName;
    private String userLastName;
    private int rating;       // 1 à 5
    private String comment;
    private LocalDateTime createdAt;
}
