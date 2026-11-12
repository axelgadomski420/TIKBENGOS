package com.elif.controllers.community;

import com.elif.dto.community.request.SendMessageRequest;
import com.elif.dto.community.request.DirectMessageNotificationPreferencesRequest;
import com.elif.dto.community.response.AdminConversationResponse;
import com.elif.dto.community.response.DirectMessageNotificationPreferencesResponse;
import com.elif.dto.community.realtime.SeenEvent;
import com.elif.dto.community.response.ConversationResponse;
import com.elif.dto.community.response.MessageResponse;
import com.elif.services.community.MessagingService;
import com.elif.services.community.CommunityService;
import lombok.AllArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.Objects;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/community/messages")
@AllArgsConstructor
public class MessagingController {

    private final MessagingService messagingService;
    private final CommunityService communityService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/inbox")
    public List<ConversationResponse> getInbox(@RequestHeader("X-User-Id") Long userId) {
        return messagingService.getInbox(userId);
    }

    @GetMapping("/admin/conversations")
    public List<AdminConversationResponse> getAdminConversations(@RequestHeader("X-User-Id") Long userId) {
        return messagingService.getAdminConversations(userId);
    }

    @GetMapping("/admin/conversations/{id}")
    public List<MessageResponse> getAdminConversationMessages(@PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return messagingService.getMessagesForAdmin(id, userId);
    }

    @GetMapping("/presence")
    public Set<Long> getPresenceSnapshot(@RequestHeader("X-User-Id") Long userId) {
        // Header is required to keep the same auth contract as other messaging
        // endpoints.
        return messagingService.onlineUserIds();
    }

    @GetMapping("/preferences")
    public DirectMessageNotificationPreferencesResponse getDirectMessagePreferences(
            @RequestHeader("X-User-Id") Long userId) {
        return communityService.getDirectMessageNotificationPreferences(userId);
    }

    @PutMapping("/preferences")
    public DirectMessageNotificationPreferencesResponse updateDirectMessagePreferences(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody DirectMessageNotificationPreferencesRequest request) {
        return communityService.updateDirectMessageNotificationPreferences(userId, request);
    }

    @GetMapping("/conversations/{id}")
    public List<MessageResponse> getMessages(@PathVariable Long id, @RequestHeader("X-User-Id") Long userId) {
        return messagingService.getMessages(id, userId);
    }

    @PostMapping("/conversations")
    public ConversationResponse startOrGet(@RequestHeader("X-User-Id") Long userId,
            @RequestParam Long otherUserId) {
        return messagingService.startOrGet(userId, otherUserId);
    }

    @PostMapping("/conversations/{id}/send")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse send(@PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody SendMessageRequest request) {
        MessageResponse response = messagingService.send(id, userId, request);
        messagingTemplate.convertAndSend("/topic/community.conversation." + id + ".messages", response);
        return response;
    }

    @PostMapping(value = "/conversations/{id}/send-image", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse sendImage(@PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "imageUrl", required = false) String imageUrl,
            @RequestParam(value = "replyToMessageId", required = false) Long replyToMessageId,
            @RequestParam(value = "content", required = false) String content) {
        MessageResponse response = messagingService.sendImage(id, userId, file, imageUrl, content, replyToMessageId);
        messagingTemplate.convertAndSend("/topic/community.conversation." + id + ".messages", response);
        return response;
    }

    @PutMapping("/messages/{messageId}")
    public MessageResponse updateMessage(@PathVariable Long messageId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody SendMessageRequest request) {
        MessageResponse response = messagingService.updateMessage(messageId, userId,
                request == null ? null : request.getContent());
        messagingTemplate.convertAndSend("/topic/community.conversation." + response.getConversationId() + ".messages",
                response);
        return response;
    }

    @GetMapping("/attachments/{attachmentId}/content")
    public ResponseEntity<byte[]> getAttachmentContent(@PathVariable Long attachmentId,
            @RequestHeader("X-User-Id") Long userId) {
        MessagingService.AttachmentContent payload = messagingService.getAttachmentContent(attachmentId, userId);
        String contentType = payload.contentType() != null && !payload.contentType().isBlank()
                ? payload.contentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        MediaType mediaType = MediaType.parseMediaType(Objects.requireNonNull(contentType));

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header("Cache-Control", "private, max-age=300")
                .body(payload.data());
    }

    @PutMapping("/conversations/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markConversationRead(@PathVariable Long id, @RequestHeader("X-User-Id") Long userId) {
        messagingService.markConversationRead(id, userId);
        messagingTemplate.convertAndSend("/topic/community.conversation." + id + ".seen", SeenEvent.builder()
                .conversationId(id)
                .readerId(userId)
                .seenAt(LocalDateTime.now())
                .build());
    }

    @DeleteMapping({ "/messages/{messageId}", "/{messageId}" })
    public MessageResponse deleteMessage(@PathVariable Long messageId, @RequestHeader("X-User-Id") Long userId) {
        MessageResponse response = messagingService.deleteMessage(messageId, userId);
        messagingTemplate.convertAndSend("/topic/community.conversation." + response.getConversationId() + ".messages",
                response);
        return response;
    }

    @DeleteMapping("/admin/messages/{messageId}")
    public MessageResponse moderateDeleteMessage(@PathVariable Long messageId,
            @RequestHeader("X-User-Id") Long userId) {
        MessageResponse response = messagingService.moderateDeleteMessage(messageId, userId);
        messagingTemplate.convertAndSend("/topic/community.conversation." + response.getConversationId() + ".messages",
                response);
        return response;
    }
}
