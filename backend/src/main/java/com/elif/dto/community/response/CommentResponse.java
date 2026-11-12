package com.elif.dto.community.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class CommentResponse {
    private Long id;
    private Long postId;
    private Long parentCommentId;
    private Long userId;
    private String authorName;
    private String content;
    private String imageUrl;
    private int voteScore;
    private Integer userVote;
    private boolean acceptedAnswer;
    private LocalDateTime createdAt;
    @Builder.Default
    private List<CommentResponse> replies = new ArrayList<>();
}
