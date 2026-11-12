package com.elif.dto.events.response;

import com.elif.entities.events.EventStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {

    // ===== INFORMATIONS DE BASE =====
    private Long id;
    private String title;
    private String description;
    private String location;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer maxParticipants;
    private int remainingSlots;
    private String imageUrl;
    private EventStatus status;

    // ===== CATÉGORIE =====
    private Long categoryId;
    private String categoryName;

    // ===== ORGANISATEUR =====
    private Long createdByUserId;
    private String createdByUserName;

    // ===== MÉTRIQUES =====
    private Double averageRating;
    private Integer reviewCount;
    private LocalDateTime createdAt;

    // ===== SUGGESTIONS =====
    private List<EventResponse> suggestedEvents;
}