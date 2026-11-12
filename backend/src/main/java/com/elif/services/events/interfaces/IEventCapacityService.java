package com.elif.services.events.interfaces;

import com.elif.dto.events.response.EventCapacityResponse;

public interface IEventCapacityService {
    EventCapacityResponse getCapacitySnapshot(Long eventId);
    void assertSlotsAvailable(Long eventId, int requestedSeats);
    EventCapacityResponse recalculateSlots(Long eventId);
}
