package com.elif.dto.community.response;

import com.elif.entities.community.enums.MemberRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CommunityMemberResponse {
    private Long userId;
    private String name;
    private MemberRole role;
    private LocalDateTime joinedAt;
}
