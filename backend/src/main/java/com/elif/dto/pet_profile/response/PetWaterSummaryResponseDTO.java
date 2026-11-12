package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PetWaterSummaryResponseDTO {
    private Integer todayIntakeMl;
    private Integer dailyTargetMl;
    private Integer remainingMl;
    private Integer adherencePercent;
}
