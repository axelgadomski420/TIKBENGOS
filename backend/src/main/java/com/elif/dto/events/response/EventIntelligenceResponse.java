package com.elif.dto.events.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventIntelligenceResponse {
    private int score;

    @JsonProperty("prediction_attendance")
    private int predictionAttendance;

    @JsonProperty("prediction_engagement")
    private int predictionEngagement;

    private String analysis;

    @Builder.Default
    private List<Recommendation> recommendations = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Recommendation {
        private String field;
        private String reason;

        @JsonProperty("suggested_value")
        private Object suggestedValue;
    }
}
