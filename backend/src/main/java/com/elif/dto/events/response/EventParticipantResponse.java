package com.elif.dto.events.response;

import com.elif.entities.events.ParticipantStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventParticipantResponse {
    private Long id;
    private Long eventId;
    private String eventTitle;
    private Long userId;
    private String userName;
    private Integer numberOfSeats;
    private ParticipantStatus status;
    private LocalDateTime registeredAt;
    private Integer eligibilityScore;
}