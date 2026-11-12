package com.elif.dto.events.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EventCapacityResponse {
    private Long    eventId;
    private String  eventTitle;
    private int     maxParticipants;
    private int     remainingSlots;
    private int     confirmedParticipants;
    private int     waitlistCount;
    private double  fillRatePercent;
    private boolean isFull;
    private boolean hasWaitlist;
}
