package com.elif.dto.pet_transit.request;

import com.elif.entities.pet_transit.enums.DestinationType;
import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.pet_transit.enums.TransportType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Set;

@Data
public class TravelDestinationUpdateRequest {

    private String title;
    private String country;
    private String region;
    private DestinationType destinationType;
    private TransportType recommendedTransportType;

    @Min(1) @Max(5)
    private Integer petFriendlyLevel;

    private String description;
    private String safetyTips;
    private Set<DocumentType> requiredDocuments;
    private String coverImageUrl;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private boolean replaceCarouselImages = false;
}