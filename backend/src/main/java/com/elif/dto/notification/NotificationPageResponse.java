package com.elif.dto.notification;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class NotificationPageResponse {
    private List<NotificationResponse> notifications;
    private long unreadCount;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
