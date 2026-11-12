package com.elif.dto.events.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO unique — supprime EventIntelligenceResponse (doublon)
 *
 * Champs sérialisés en snake_case pour correspondre exactement
 * au JSON renvoyé par GROQ.
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EventAnalysisResponseDTO {

    /** Score global 0–100 */
    private int score;

    /** Estimation du nombre de participants (≤ maxCapacity) */
    @JsonProperty("prediction_attendance")
    private int predictionAttendance;

    /** Engagement prédit 1–10 */
    @JsonProperty("prediction_engagement")
    private int predictionEngagement;

    /** Résumé narratif (≤ 240 chars) */
    private String analysis;

    @Builder.Default
    private List<RecommendationDTO> recommendations = new ArrayList<>();

    // ── Niveau de qualité calculé côté frontend ──────────────────────

    /** "excellent" | "good" | "average" | "weak" — calculé à partir du score */
    public String getLevel() {
        if (score >= 80) return "excellent";
        if (score >= 60) return "good";
        if (score >= 40) return "average";
        return "weak";
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RecommendationDTO {
        /** "title" | "description" | "date" | "location" | "animal_types" | "max_capacity" */
        private String field;

        /** Priorité : "high" | "medium" | "low" */
        private String priority;

        /** Explication courte */
        private String reason;

        /** Valeur suggérée (String, int, ou List<String>) */
        @JsonProperty("suggested_value")
        private Object suggestedValue;
    }
}
