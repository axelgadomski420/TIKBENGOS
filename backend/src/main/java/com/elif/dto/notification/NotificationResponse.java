package com.elif.dto.notification;

import com.elif.entities.notification.enums.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private Long userId;
    private Long actorUserId;
    private NotificationType type;
    private String title;
    private String message;
    private String deepLink;
    private String referenceType;
    private Long referenceId;
    private boolean read;
    private LocalDateTime createdAt;
}
