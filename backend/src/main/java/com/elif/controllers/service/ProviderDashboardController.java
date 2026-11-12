package com.elif.controllers.service;

import com.elif.dto.service.ProviderDashboardDTO;
import com.elif.services.service.ProviderDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller REST exposant le dashboard IA provider.
 * POST /api/provider-dashboard/generate  { "providerId": 1 }
 */
@RestController
@RequestMapping("/api/provider-dashboard")
public class ProviderDashboardController {

    private final ProviderDashboardService dashboardService;

    public ProviderDashboardController(ProviderDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Génère un dashboard IA complet pour le provider donné.
     * Body : { "providerId": 123 }
     */
    @PostMapping("/generate")
    public ResponseEntity<ProviderDashboardDTO> generate(@RequestBody Map<String, Long> body) {
        Long providerId = body.get("providerId");
        if (providerId == null) {
            return ResponseEntity.badRequest().build();
        }
        ProviderDashboardDTO result = dashboardService.generate(providerId);
        return ResponseEntity.ok(result);
    }
}
