package com.elif.dto.events.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JoinSessionResponse {
    private String roomUrl;
    private boolean isExternal;
    private boolean canJoin;
    private String message;
    private Integer earlyAccessRemainingMinutes;
    private boolean isModerator;
    private boolean waitingForModerator;
    private String accessToken;
}