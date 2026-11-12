package com.elif.controllers.pet_transit;

import com.elif.dto.pet_transit.response.RiskAssessmentResponse;
import com.elif.services.pet_transit.RiskAssessmentService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/travel-plans")
@AllArgsConstructor
public class RiskAssessmentController {

    private final RiskAssessmentService riskAssessmentService;

    @GetMapping("/{planId}/risk-assessment")
    public ResponseEntity<RiskAssessmentResponse> assessRisk(
            @PathVariable Long planId,
            @RequestHeader("X-User-Id") Long userId) {

        RiskAssessmentResponse response =
                riskAssessmentService.assess(planId, userId);
        return ResponseEntity.ok(response);
    }
}
