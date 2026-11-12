package com.elif.dto.pet_transit.request;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TravelDestinationPublishRequest {

    // null = publish now, non-null = schedule for later
    private LocalDateTime scheduledPublishAt;
}