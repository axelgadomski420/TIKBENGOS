package com.elif.controllers.notification;

import com.elif.dto.notification.NotificationPageResponse;
import com.elif.dto.notification.NotificationResponse;
import com.elif.services.notification.AppNotificationService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@AllArgsConstructor
public class NotificationController {

    private final AppNotificationService appNotificationService;

    @GetMapping
    public NotificationPageResponse list(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(value = "unreadOnly", defaultValue = "false") boolean unreadOnly,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return appNotificationService.listForUser(userId, unreadOnly, page, size);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@RequestHeader("X-User-Id") Long userId) {
        return Map.of("unreadCount", appNotificationService.countUnread(userId));
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@RequestHeader("X-User-Id") Long userId,
            @PathVariable("id") Long notificationId) {
        return appNotificationService.markRead(userId, notificationId);
    }

    @PatchMapping("/read-all")
    public void markAllRead(@RequestHeader("X-User-Id") Long userId) {
        appNotificationService.markAllRead(userId);
    }

    @DeleteMapping("/clear-all")
    public void clearAll(@RequestHeader("X-User-Id") Long userId) {
        appNotificationService.clearAll(userId);
    }

    @DeleteMapping("/{id}")
    public void clearOne(@RequestHeader("X-User-Id") Long userId,
            @PathVariable("id") Long notificationId) {
        appNotificationService.clearOne(userId, notificationId);
    }
}
