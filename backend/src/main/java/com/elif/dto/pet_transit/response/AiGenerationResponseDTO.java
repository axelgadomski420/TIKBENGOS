package com.elif.dto.pet_transit.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerationResponseDTO {

    private String description;
    private String safetyTips;
    private String errorMessage;
}
