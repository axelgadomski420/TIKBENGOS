package com.elif.dto.community.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminConversationResponse {
    private Long id;
    private Long participantOneId;
    private Long participantTwoId;
    private String participantOneName;
    private String participantTwoName;
    private LocalDateTime lastMessageAt;
    private String lastMessagePreview;
    private Long lastMessageSenderId;
    private long totalMessageCount;
    private long deletedMessageCount;
}
