package com.elif.dto.events.response;

import com.elif.entities.events.EventStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventSummaryResponse {

    private Long id;
    private String title;
    private String location;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer maxParticipants;
    private Integer remainingSlots;
    private String coverImageUrl;
    private EventStatus status;
    private EventCategoryResponse category;
    private String organizerName;
    private Double averageRating;
    private Integer reviewCount;
    private boolean               isOnline;
}