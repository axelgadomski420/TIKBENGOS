package com.elif.dto.pet_transit.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DestinationImageResponse {
    private Long id;
    private String imageUrl;
    private Integer displayOrder;
}
