package com.elif.dto.events.response;

import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AttendanceResponse {

    private Long          userId;
    private String        userName;
    private Long          sessionId;
    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
    private long          totalMinutesPresent;
    private Double        attendancePercent;
    private boolean       certificateEarned;
    private String        certificateUrl;
    private boolean       currentlyConnected;
}
