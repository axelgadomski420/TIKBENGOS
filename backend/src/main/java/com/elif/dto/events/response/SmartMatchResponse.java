package com.elif.dto.events.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class SmartMatchResponse {

    private String summary;
    private List<EventMatch> matches;
    private String noMatchReason;

    @Data
    @Builder
    public static class EventMatch {
        private Long eventId;
        private int score;
        private String label;      // "perfect", "great", "good", "maybe"
        private String reason;
        private boolean eligible;
        private String eligibilityNote;
    }
}