package com.elif.dto.community.request;

import lombok.Data;

@Data
public class CreateCommentRequest {
    private String content;
    private String imageUrl;
    private Long parentCommentId;
}
