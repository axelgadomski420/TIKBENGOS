package com.elif.dto.community.realtime;

import lombok.Data;

@Data
public class TypingRequest {
    private Long conversationId;
    private boolean typing;
}
