package com.elif.dto.community.request;

import lombok.Data;

@Data
public class SendMessageRequest {
    private String content;
    private Long replyToMessageId;
}
