package com.elif.dto.pet_transit.response;

import com.elif.entities.pet_transit.enums.DestinationStatus;
import com.elif.entities.pet_transit.enums.DestinationType;
import com.elif.entities.pet_transit.enums.TransportType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Data
@Builder
public class TravelDestinationResponse {

    private Long id;
    private String title;
    private String country;
    private String region;
    private DestinationType destinationType;
    private TransportType recommendedTransportType;
    private Integer petFriendlyLevel;
    private String description;
    private String safetyTips;
    private Set<String> requiredDocuments;   // DocumentType.name() as String
    private String coverImageUrl;
    private List<DestinationImageResponse> carouselImages;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Integer linkedPlansCount;
    private DestinationStatus status;
    private DestinationStatus previousStatusBeforeArchive;
    private LocalDateTime scheduledPublishAt;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}