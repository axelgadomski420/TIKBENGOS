package com.elif.dto.events.response;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SessionStatsResponse {

    private Long   sessionId;
    private String eventTitle;

    private long   totalRegistered;     // inscrits CONFIRMED
    private long   totalJoined;         // participants qui ont rejoint au moins 1 fois
    private double averageAttendance;   // % moyen de présence
    private long   certificatesEarned;  // nb certificats accordés

    private List<AttendanceResponse> participantDetails;
}
