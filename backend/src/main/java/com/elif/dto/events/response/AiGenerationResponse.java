package com.elif.dto.events.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AiGenerationResponse {
    private String text;
    private Integer wordCount;
    private Integer charCount;
    private Double elapsedSeconds;
    private String tone;
    private String language;
    private LocalDateTime generatedAt;
}