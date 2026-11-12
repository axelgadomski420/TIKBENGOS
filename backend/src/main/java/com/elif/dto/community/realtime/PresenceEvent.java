package com.elif.dto.community.realtime;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class PresenceEvent {
    Long userId;
    String userName;
    boolean online;
    LocalDateTime occurredAt;
}
