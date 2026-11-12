package com.elif.dto.pet_transit.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskAssessmentResponse {
    private String riskLevel;
    private Integer riskScore;
    private String summary;
    private List<RiskIssueDto> criticalIssues;
    private List<RiskIssueDto> warnings;
    private List<String> positives;
    private List<String> recommendations;
    private String estimatedReadyDate;
    private Double confidenceLevel;
    private Boolean fromCache;
}
