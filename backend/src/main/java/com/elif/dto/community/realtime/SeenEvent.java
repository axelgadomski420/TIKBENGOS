package com.elif.dto.community.realtime;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class SeenEvent {
    Long conversationId;
    Long readerId;
    String readerName;
    LocalDateTime seenAt;
}