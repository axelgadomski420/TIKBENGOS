package com.elif.dto.community.request;

import lombok.Data;

@Data
public class DirectMessageNotificationPreferencesRequest {
    private Boolean emailOnUnreadDirectMessage;
}
