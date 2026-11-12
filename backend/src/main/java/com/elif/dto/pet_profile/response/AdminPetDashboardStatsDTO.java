package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class AdminPetDashboardStatsDTO {
    private long totalPets;
    private long petsWithPhoto;
    private long petsWithGps;
    private long createdLast30Days;
    private long updatedLast7Days;
    private Map<String, Long> speciesBreakdown;
}
