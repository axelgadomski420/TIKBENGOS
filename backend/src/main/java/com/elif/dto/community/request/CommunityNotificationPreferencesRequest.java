package com.elif.dto.community.request;

import lombok.Data;

@Data
public class CommunityNotificationPreferencesRequest {
    private Boolean emailOnPostReply;
    private Boolean emailOnMention;
    private Boolean weeklyDigestEnabled;
}
