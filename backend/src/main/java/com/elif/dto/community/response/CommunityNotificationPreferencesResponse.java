package com.elif.dto.community.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommunityNotificationPreferencesResponse {
    private Long communityId;
    private String communitySlug;
    private boolean emailOnPostReply;
    private boolean emailOnMention;
    private boolean weeklyDigestEnabled;
}
