package com.elif.dto.community.response;

import com.elif.entities.community.enums.PostType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PostResponse {
    private Long id;
    private Long communityId;
    private String communitySlug;
    private Long userId;
    private String authorName;
    private String title;
    private String content;
    private String imageUrl;
    private PostType type;
    private Long flairId;
    private String flairName;
    private int voteScore;
    private Integer userVote;
    private int viewCount;
    private int commentCount;
    private boolean pinned;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
