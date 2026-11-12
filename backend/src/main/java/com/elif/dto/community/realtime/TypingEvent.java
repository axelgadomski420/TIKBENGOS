package com.elif.dto.community.realtime;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class TypingEvent {
    Long conversationId;
    Long senderId;
    String senderName;
    boolean typing;
    LocalDateTime occurredAt;
}
