package com.elif.dto.events.request;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AiGenerationRequest {
    private String title;
    private String categoryName;
    private String categoryIcon;
    private Boolean isCompetition;
    private Boolean requiresApproval;
    private String location;
    private LocalDateTime startDate;      // ← Changer String → LocalDateTime
    private LocalDateTime endDate;        // ← Changer String → LocalDateTime
    private Integer maxParticipants;
    private Boolean isOnline;
    private List<RuleSummary> rules;
    private String tone;
    private String language;

    @Data
    public static class RuleSummary {
        private String criteria;
        private String label;
        private String value;
        private Boolean isHard;
    }
}