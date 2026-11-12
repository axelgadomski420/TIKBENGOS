package com.elif.dto.pet_transit.request;

import lombok.Data;

@Data
public class AiGenerationRequestDTO {

    private String target;
    private String title;
    private String country;
    private String region;
    private String destinationType;
    private String transport;
    private Integer petFriendlyLevel;
}
