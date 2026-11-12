package com.elif.scheduler.pet_transit;

import com.elif.services.pet_transit.TravelDestinationService;
import lombok.AllArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class TravelDestinationPublicationScheduler {

    private final TravelDestinationService travelDestinationService;

    @Scheduled(fixedRate = 60000)
    public void publishScheduledDestinations() {
        travelDestinationService.publishDueScheduledDestinations();
    }
}
