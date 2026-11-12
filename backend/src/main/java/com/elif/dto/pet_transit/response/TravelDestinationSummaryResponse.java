package com.elif.dto.pet_transit.response;

import com.elif.entities.pet_transit.enums.DestinationStatus;
import com.elif.entities.pet_transit.enums.DestinationType;
import com.elif.entities.pet_transit.enums.TransportType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TravelDestinationSummaryResponse {

    private Long id;
    private String title;
    private String country;
    private String region;
    private DestinationType destinationType;
    private TransportType recommendedTransportType;
    private Integer petFriendlyLevel;
    private String coverImageUrl;
    private DestinationStatus status;
}