package com.elif.dto.pet_transit.request;

import com.elif.entities.pet_transit.enums.DestinationType;
import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.pet_transit.enums.TransportType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Set;

@Data
public class TravelDestinationCreateRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String country;

    private String region;

    @NotNull
    private DestinationType destinationType;

    @NotNull
    private TransportType recommendedTransportType;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer petFriendlyLevel;

    private String description;
    private String safetyTips;
    private Set<DocumentType> requiredDocuments;
    private String coverImageUrl;
    private BigDecimal latitude;
    private BigDecimal longitude;
}