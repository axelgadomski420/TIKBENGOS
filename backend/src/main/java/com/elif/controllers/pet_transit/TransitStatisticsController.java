package com.elif.controllers.pet_transit;

import com.elif.dto.pet_transit.response.TransitDashboardDTO;
import com.elif.services.pet_transit.TransitStatisticsService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin endpoint exposing Transit overview statistics.
 * GET /api/v1/transit/statistics → TransitDashboardDTO
 *
 * Requires X-User-Id header (admin auth convention used across all transit controllers).
 */
@RestController
@RequestMapping("/api/v1/transit")
@AllArgsConstructor
public class TransitStatisticsController {

    private final TransitStatisticsService transitStatisticsService;

    @GetMapping("/statistics")
    public TransitDashboardDTO getStatistics(
            @RequestHeader("X-User-Id") Long adminId) {
        return transitStatisticsService.getStatistics(adminId);
    }
}
