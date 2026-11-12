package com.elif.dto.events.response;

import com.elif.entities.events.EventStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventDetailResponse {
    private Long id;
    private String title;
    private String description;
    private String location;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer maxParticipants;
    private Integer remainingSlots;
    private String coverImageUrl;
    private EventStatus status;
    private EventCategoryResponse category;
    private String organizerName;
    private Long organizerId;
    private LocalDateTime createdAt;
    private Double averageRating;
    private Integer reviewCount;
    // Suggestions si l'événement est complet
    private List<EventSummaryResponse> suggestedEvents;
    @JsonProperty("isOnline")
    private boolean isOnline;

    @JsonProperty("virtualSession")
    private VirtualSessionResponse virtualSession;
}