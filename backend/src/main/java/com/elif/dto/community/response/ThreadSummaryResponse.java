package com.elif.dto.community.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ThreadSummaryResponse {
    private Long postId;
    private String summary;
    private String model;
    private LocalDateTime generatedAt;
    private int commentCount;
    private boolean truncated;
}
