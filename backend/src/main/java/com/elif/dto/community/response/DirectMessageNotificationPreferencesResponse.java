package com.elif.dto.community.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DirectMessageNotificationPreferencesResponse {
    private boolean emailOnUnreadDirectMessage;
}
