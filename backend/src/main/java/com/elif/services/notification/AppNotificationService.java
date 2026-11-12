package com.elif.services.notification;

import com.elif.dto.notification.NotificationPageResponse;
import com.elif.dto.notification.NotificationResponse;
import com.elif.entities.notification.AppNotification;
import com.elif.entities.notification.enums.NotificationType;
import com.elif.repositories.notification.AppNotificationRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class AppNotificationService {

    private final AppNotificationRepository appNotificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationResponse create(Long userId,
            Long actorUserId,
            NotificationType type,
            String title,
            String message,
            String deepLink,
            String referenceType,
            Long referenceId) {
        if (userId == null) {
            throw new IllegalArgumentException("Recipient user id is required");
        }

        AppNotification saved = appNotificationRepository.save(AppNotification.builder()
                .userId(userId)
                .actorUserId(actorUserId)
                .type(type)
                .title(normalizeTitle(title))
                .message(normalizeMessage(message))
                .deepLink(normalizeOptional(deepLink))
                .referenceType(normalizeOptional(referenceType))
                .referenceId(referenceId)
                .read(false)
                .build());

        NotificationResponse payload = toResponse(saved);
        messagingTemplate.convertAndSend("/topic/community.notifications." + userId, payload);
        messagingTemplate.convertAndSend("/topic/community.notifications." + userId + ".count", countUnread(userId));

        return payload;
    }

    public NotificationPageResponse listForUser(Long userId, boolean unreadOnly, int page, int size) {
        requireUserId(userId);

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(100, size));
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<AppNotification> result = unreadOnly
                ? appNotificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId, pageable)
                : appNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);

        List<NotificationResponse> notifications = result.getContent().stream().map(this::toResponse).toList();
        return NotificationPageResponse.builder()
                .notifications(notifications)
                .unreadCount(countUnread(userId))
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    public NotificationResponse markRead(Long userId, Long notificationId) {
        requireUserId(userId);

        AppNotification notification = appNotificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification = appNotificationRepository.save(notification);
            messagingTemplate.convertAndSend("/topic/community.notifications." + userId + ".count",
                    countUnread(userId));
        }

        return toResponse(notification);
    }

    public void markAllRead(Long userId) {
        requireUserId(userId);

        int updatedRows = appNotificationRepository.markAllReadByUserId(userId);
        if (updatedRows <= 0) {
            return;
        }

        messagingTemplate.convertAndSend("/topic/community.notifications." + userId + ".count", 0L);
    }

    public long countUnread(Long userId) {
        requireUserId(userId);
        return appNotificationRepository.countByUserIdAndReadFalse(userId);
    }

    public void clearAll(Long userId) {
        requireUserId(userId);

        int clearedRows = appNotificationRepository.clearAllByUserId(userId);
        if (clearedRows <= 0) {
            return;
        }

        messagingTemplate.convertAndSend("/topic/community.notifications." + userId + ".count", 0L);
    }

    public void clearOne(Long userId, Long notificationId) {
        requireUserId(userId);
        if (notificationId == null) {
            throw new IllegalArgumentException("Notification id is required");
        }

        int clearedRows = appNotificationRepository.clearByIdAndUserId(notificationId, userId);
        if (clearedRows <= 0) {
            throw new IllegalArgumentException("Notification not found");
        }

        messagingTemplate.convertAndSend(
                "/topic/community.notifications." + userId + ".count",
                countUnread(userId));
    }

    private NotificationResponse toResponse(AppNotification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .actorUserId(notification.getActorUserId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .deepLink(notification.getDeepLink())
                .referenceType(notification.getReferenceType())
                .referenceId(notification.getReferenceId())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeTitle(String title) {
        String normalized = normalizeOptional(title);
        if (normalized == null) {
            return "Notification";
        }
        return normalized.length() > 220 ? normalized.substring(0, 220) : normalized;
    }

    private String normalizeMessage(String message) {
        String normalized = normalizeOptional(message);
        if (normalized == null) {
            return "You have a new update.";
        }
        return normalized;
    }

    private void requireUserId(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required");
        }
    }
}
