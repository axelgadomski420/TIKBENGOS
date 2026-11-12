package com.elif.dto.community.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class MessageResponse {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private String content;
    private Long replyToMessageId;
    private Long replyToSenderId;
    private String replyToSenderName;
    private String replyToContent;
    private List<MessageAttachmentResponse> attachments;
    private LocalDateTime readAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
}
