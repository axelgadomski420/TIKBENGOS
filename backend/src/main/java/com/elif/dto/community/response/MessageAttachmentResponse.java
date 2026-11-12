package com.elif.dto.community.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MessageAttachmentResponse {
    private Long id;
    private String fileUrl;
    private String fileType;
}
