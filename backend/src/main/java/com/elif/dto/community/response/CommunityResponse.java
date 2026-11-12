package com.elif.dto.community.response;

import com.elif.entities.community.enums.CommunityType;
import com.elif.entities.community.enums.MemberRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CommunityResponse {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private CommunityType type;
    private int memberCount;
    private String bannerUrl;
    private String iconUrl;
    private LocalDateTime createdAt;
    private MemberRole userRole;
}
