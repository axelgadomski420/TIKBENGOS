package com.elif.dto.community.request;

import com.elif.entities.community.enums.PostType;
import lombok.Data;

@Data
public class CreatePostRequest {
    private String title;
    private String content;
    private String imageUrl;
    private PostType type = PostType.DISCUSSION;
    private Long flairId;
}
