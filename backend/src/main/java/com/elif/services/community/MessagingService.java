package com.elif.services.community;

import com.elif.dto.community.request.SendMessageRequest;
import com.elif.dto.community.response.AdminConversationResponse;
import com.elif.dto.community.response.MessageAttachmentResponse;
import com.elif.dto.community.response.ConversationResponse;
import com.elif.dto.community.response.MessageResponse;
import com.elif.entities.community.Conversation;
import com.elif.entities.community.Message;
import com.elif.entities.community.MessageAttachment;
import com.elif.entities.notification.enums.NotificationType;
import com.elif.repositories.community.MessageAttachmentRepository;
import com.elif.repositories.community.CommunityMemberRepository;
import com.elif.repositories.community.ConversationRepository;
import com.elif.repositories.community.MessageRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.entities.user.Role;
import com.elif.services.notification.AppNotificationService;
import com.elif.services.notification.MentionResolutionService;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDateTime;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@AllArgsConstructor
@Transactional
public class MessagingService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MessageAttachmentRepository messageAttachmentRepository;
    private final CommunityMemberRepository communityMemberRepository;
    private final UserRepository userRepository;
    private final CommunityPresenceService communityPresenceService;
    private final AppNotificationService appNotificationService;
    private final MentionResolutionService mentionResolutionService;
    private final CommunityNotificationEmailService communityNotificationEmailService;
    private final RestTemplate restTemplate = new RestTemplate();

    public List<ConversationResponse> getInbox(Long userId) {
        return conversationRepository.findByParticipantOneIdOrParticipantTwoIdOrderByLastMessageAtDesc(userId, userId)
                .stream()
                .map(c -> toConversationResponse(c, userId))
                .toList();
    }

    public List<AdminConversationResponse> getAdminConversations(Long adminUserId) {
        requireAdmin(adminUserId);

        return conversationRepository.findAllByOrderByLastMessageAtDesc().stream()
                .map(this::toAdminConversationResponse)
                .toList();
    }

    public List<MessageResponse> getMessages(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!isParticipant(conversation, userId)) {
            throw new IllegalStateException("You are not part of this conversation");
        }

        return messageRepository.findByConversationIdAndDeletedAtIsNullOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::toMessageResponse)
                .toList();
    }

    public List<MessageResponse> getMessagesForAdmin(Long conversationId, Long adminUserId) {
        requireAdmin(adminUserId);

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId())
                .stream()
                .map(this::toMessageResponse)
                .toList();
    }

    public ConversationResponse startOrGet(Long userId, Long otherUserId) {
        if (userId == null || otherUserId == null) {
            throw new IllegalArgumentException("Both participants are required");
        }

        if (userId.equals(otherUserId)) {
            throw new IllegalArgumentException("You cannot start a conversation with yourself");
        }

        requireExistingUser(userId);
        requireExistingUser(otherUserId);

        Long p1 = Math.min(userId, otherUserId);
        Long p2 = Math.max(userId, otherUserId);

        Conversation conversation = conversationRepository.findByParticipantOneIdAndParticipantTwoId(p1, p2)
                .orElseGet(() -> conversationRepository.save(Conversation.builder()
                        .participantOneId(p1)
                        .participantTwoId(p2)
                        .build()));

        return toConversationResponse(conversation, userId);
    }

    public MessageResponse send(Long conversationId, Long senderId, SendMessageRequest req) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!isParticipant(conversation, senderId)) {
            throw new IllegalStateException("You are not part of this conversation");
        }

        String content = normalizeOptional(req != null ? req.getContent() : null);
        if (content == null) {
            throw new IllegalArgumentException("Message content is required");
        }

        Message replyToMessage = resolveReplyTarget(conversation, req != null ? req.getReplyToMessageId() : null);
        Message message = messageRepository.save(Message.builder()
                .conversation(conversation)
                .senderId(senderId)
                .content(content)
                .replyToMessage(replyToMessage)
                .build());

        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        notifyChatRecipient(conversation, senderId, content, message.getId());

        return toMessageResponse(message);
    }

    public MessageResponse updateMessage(Long messageId, Long userId, String content) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getSenderId().equals(userId)) {
            throw new IllegalStateException("Only sender can edit message");
        }

        if (message.isDeleted()) {
            throw new IllegalStateException("Deleted messages cannot be edited");
        }

        String normalizedContent = normalizeOptional(content);
        if (normalizedContent == null) {
            throw new IllegalArgumentException("Message content is required");
        }

        message.setContent(normalizedContent);
        message.setUpdatedAt(LocalDateTime.now());
        messageRepository.save(message);

        return toMessageResponse(message);
    }

    public MessageResponse sendImage(Long conversationId, Long senderId, MultipartFile image, String imageUrl,
            String content, Long replyToMessageId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!isParticipant(conversation, senderId)) {
            throw new IllegalStateException("You are not part of this conversation");
        }

        boolean hasFile = image != null && !image.isEmpty();
        String normalizedImageUrl = normalizeOptional(imageUrl);

        if (!hasFile && normalizedImageUrl == null) {
            throw new IllegalArgumentException("Image file or imageUrl is required");
        }

        String fileType = "image/gif";
        byte[] imageBytes;
        if (hasFile) {
            MultipartFile uploadedImage = image;
            if (uploadedImage == null || uploadedImage.isEmpty()) {
                throw new IllegalArgumentException("Image file is required");
            }

            fileType = uploadedImage.getContentType();
            if (fileType == null || !fileType.startsWith("image/")) {
                throw new IllegalArgumentException("Only image attachments are allowed");
            }

            try {
                imageBytes = uploadedImage.getBytes();
            } catch (IOException ex) {
                throw new IllegalStateException("Could not read image content", ex);
            }
        } else {
            URI remoteUri = URI.create(normalizedImageUrl);
            String host = remoteUri.getHost();
            if (host == null || (!host.endsWith("giphy.com") && !host.endsWith("giphy.io"))) {
                throw new IllegalArgumentException("Only Giphy image URLs are allowed");
            }

            try {
                var remoteResponse = restTemplate.getForEntity(remoteUri, byte[].class);
                imageBytes = remoteResponse.getBody();
                var remoteContentType = remoteResponse.getHeaders().getContentType();
                fileType = remoteContentType != null ? remoteContentType.toString() : "image/gif";
            } catch (Exception ex) {
                throw new IllegalStateException("Could not load remote GIF", ex);
            }
        }

        if (imageBytes == null || imageBytes.length == 0) {
            throw new IllegalArgumentException("Image content is empty");
        }

        Message replyToMessage = resolveReplyTarget(conversation, replyToMessageId);

        Message message = Message.builder()
                .conversation(conversation)
                .senderId(senderId)
                .content(normalizeOptional(content))
                .replyToMessage(replyToMessage)
                .attachments(new ArrayList<>())
                .build();

        MessageAttachment attachment = MessageAttachment.builder()
                .message(message)
                .fileUrl("blob://pending")
                .fileType(fileType)
                .fileData(imageBytes)
                .build();

        message.getAttachments().add(attachment);
        Message saved = messageRepository.save(message);

        // Populate a stable API URL after ID generation.
        saved.getAttachments().forEach(
                currentAttachment -> currentAttachment.setFileUrl(buildAttachmentAccessUrl(currentAttachment.getId())));
        saved = messageRepository.save(saved);

        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        notifyChatRecipient(
                conversation,
                senderId,
                "sent you an image" + (normalizeOptional(content) == null ? "" : ": " + normalizeReplyPreview(content)),
                saved.getId());

        return toMessageResponse(saved);
    }

    public void markConversationRead(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!isParticipant(conversation, userId)) {
            throw new IllegalStateException("You are not part of this conversation");
        }

        List<Message> unreadMessages = messageRepository.findByConversationIdAndSenderIdNotAndReadAtIsNull(
                conversationId,
                userId);
        if (unreadMessages.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        for (Message message : unreadMessages) {
            message.setReadAt(now);
        }
        messageRepository.saveAll(unreadMessages);
    }

    public MessageResponse deleteMessage(Long messageId, Long userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getSenderId().equals(userId)) {
            throw new IllegalStateException("Only sender can delete message");
        }

        message.setDeletedAt(LocalDateTime.now());
        message.setUpdatedAt(LocalDateTime.now());
        return toMessageResponse(messageRepository.save(message));
    }

    public MessageResponse moderateDeleteMessage(Long messageId, Long adminUserId) {
        requireAdmin(adminUserId);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (message.isDeleted()) {
            return toMessageResponse(message);
        }

        message.setDeletedAt(LocalDateTime.now());
        message.setUpdatedAt(LocalDateTime.now());
        return toMessageResponse(messageRepository.save(message));
    }

    public boolean isParticipant(Long conversationId, Long userId) {
        return conversationRepository.findById(conversationId)
                .map(conversation -> isParticipant(conversation, userId))
                .orElse(false);
    }

    public Set<Long> onlineUserIds() {
        return communityPresenceService.onlineUserIds();
    }

    public AttachmentContent getAttachmentContent(Long attachmentId, Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required");
        }

        MessageAttachment attachment = messageAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));

        Message message = attachment.getMessage();
        if (message == null || message.getConversation() == null) {
            throw new IllegalStateException("Attachment is not linked to a conversation");
        }

        if (!isParticipant(message.getConversation(), userId)) {
            throw new IllegalStateException("You are not allowed to access this attachment");
        }

        byte[] payload = attachment.getFileData();
        if (payload == null || payload.length == 0) {
            throw new IllegalStateException("Attachment content is unavailable");
        }

        return new AttachmentContent(payload, attachment.getFileType());
    }

    private boolean isParticipant(Conversation c, Long userId) {
        return c.getParticipantOneId().equals(userId) || c.getParticipantTwoId().equals(userId);
    }

    private MessageResponse toMessageResponse(Message message) {
        Message reply = message.getReplyToMessage();

        return MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderId(message.getSenderId())
                .senderName(fullName(message.getSenderId()))
                .content(message.getContent())
                .replyToMessageId(reply != null ? reply.getId() : null)
                .replyToSenderId(reply != null ? reply.getSenderId() : null)
                .replyToSenderName(reply != null ? fullName(reply.getSenderId()) : null)
                .replyToContent(reply != null ? normalizeReplyPreview(reply.getContent()) : null)
                .attachments(message.getAttachments().stream()
                        .map(attachment -> MessageAttachmentResponse.builder()
                                .id(attachment.getId())
                                .fileUrl(resolveAttachmentUrl(attachment))
                                .fileType(attachment.getFileType())
                                .build())
                        .toList())
                .readAt(message.getReadAt())
                .updatedAt(message.getUpdatedAt())
                .deletedAt(message.getDeletedAt())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private ConversationResponse toConversationResponse(Conversation conversation, Long viewerUserId) {
        Long counterpartId = conversation.getParticipantOneId().equals(viewerUserId)
                ? conversation.getParticipantTwoId()
                : conversation.getParticipantOneId();
        Message latestMessage = messageRepository
                .findTopByConversationIdAndDeletedAtIsNullOrderByCreatedAtDesc(conversation.getId())
                .orElse(null);

        return ConversationResponse.builder()
                .id(conversation.getId())
                .participantOneId(conversation.getParticipantOneId())
                .participantTwoId(conversation.getParticipantTwoId())
                .participantOneName(fullName(conversation.getParticipantOneId()))
                .participantTwoName(fullName(conversation.getParticipantTwoId()))
                .counterpartName(fullName(counterpartId))
                .lastMessageAt(conversation.getLastMessageAt())
                .lastMessagePreview(latestMessage == null ? null : buildConversationPreview(latestMessage))
                .lastMessageSenderId(latestMessage == null ? null : latestMessage.getSenderId())
                .unreadCount(messageRepository.countByConversationIdAndSenderIdNotAndReadAtIsNull(conversation.getId(),
                        viewerUserId))
                .build();
    }

    private AdminConversationResponse toAdminConversationResponse(Conversation conversation) {
        Message latestMessage = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conversation.getId())
                .orElse(null);

        return AdminConversationResponse.builder()
                .id(conversation.getId())
                .participantOneId(conversation.getParticipantOneId())
                .participantTwoId(conversation.getParticipantTwoId())
                .participantOneName(fullName(conversation.getParticipantOneId()))
                .participantTwoName(fullName(conversation.getParticipantTwoId()))
                .lastMessageAt(conversation.getLastMessageAt())
                .lastMessagePreview(latestMessage == null ? null : buildConversationPreview(latestMessage))
                .lastMessageSenderId(latestMessage == null ? null : latestMessage.getSenderId())
                .totalMessageCount(messageRepository.countByConversationId(conversation.getId()))
                .deletedMessageCount(messageRepository.countByConversationIdAndDeletedAtIsNotNull(conversation.getId()))
                .build();
    }

    private String resolveAttachmentUrl(MessageAttachment attachment) {
        if (attachment.getFileData() != null && attachment.getId() != null) {
            return buildAttachmentAccessUrl(attachment.getId());
        }
        return attachment.getFileUrl();
    }

    private String buildAttachmentAccessUrl(Long attachmentId) {
        return "/elif/api/community/messages/attachments/" + attachmentId + "/content";
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Message resolveReplyTarget(Conversation conversation, Long replyToMessageId) {
        if (replyToMessageId == null) {
            return null;
        }

        Message replyTarget = messageRepository.findById(replyToMessageId)
                .orElseThrow(() -> new IllegalArgumentException("Reply target message not found"));

        Long targetConversationId = replyTarget.getConversation() != null ? replyTarget.getConversation().getId()
                : null;
        if (targetConversationId == null || !targetConversationId.equals(conversation.getId())) {
            throw new IllegalArgumentException("Reply target must belong to the same conversation");
        }

        return replyTarget;
    }

    private String normalizeReplyPreview(String content) {
        String normalized = normalizeOptional(content);
        if (normalized == null) {
            return "";
        }

        return normalized.length() > 140 ? normalized.substring(0, 137) + "..." : normalized;
    }

    private String fullName(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getFirstName() + " " + u.getLastName())
                .orElse("Unknown User");
    }

    private void requireExistingUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }
    }

    private void requireAdmin(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required");
        }

        boolean isAdmin = userRepository.findById(userId)
                .map(user -> user.getRole() == Role.ADMIN)
                .orElse(false);

        if (!isAdmin) {
            throw new IllegalStateException("Admin role required");
        }
    }

    private String buildConversationPreview(Message message) {
        String content = normalizeOptional(message.getContent());
        boolean hasAttachments = message.getAttachments() != null && !message.getAttachments().isEmpty();

        if (message.isDeleted()) {
            return "Message deleted";
        }

        if (content != null) {
            return content.length() > 90 ? content.substring(0, 87) + "..." : content;
        }

        if (hasAttachments) {
            return "Sent an image";
        }

        return "Started a conversation";
    }

    public record AttachmentContent(byte[] data, String contentType) {
    }

    private void notifyChatRecipient(Conversation conversation, Long senderId, String contentPreview, Long messageId) {
        if (conversation == null || senderId == null) {
            return;
        }

        Long recipientId = conversation.getParticipantOneId().equals(senderId)
                ? conversation.getParticipantTwoId()
                : conversation.getParticipantOneId();
        if (recipientId == null || recipientId.equals(senderId)) {
            return;
        }

        boolean recipientMentioned = mentionResolutionService.resolveMentionedUserIds(contentPreview)
                .contains(recipientId);

        appNotificationService.create(
                recipientId,
                senderId,
                recipientMentioned ? NotificationType.COMMUNITY_CHAT_MENTION : NotificationType.COMMUNITY_CHAT_MESSAGE,
                recipientMentioned ? "You were mentioned in chat" : "New message",
                recipientMentioned
                        ? fullName(senderId) + " mentioned you: " + normalizeReplyPreview(contentPreview)
                        : fullName(senderId) + ": " + normalizeReplyPreview(contentPreview),
                "/app/community/chat/" + conversation.getId(),
                "MESSAGE",
                messageId);

        if (recipientMentioned) {
            communityNotificationEmailService.sendMentionEmail(
                    null,
                    recipientId,
                    "Direct messages",
                    fullName(senderId),
                    fullName(senderId) + " mentioned you in a direct message",
                    "/app/community/chat/" + conversation.getId(),
                    firstCommunitySlug(recipientId));
            return;
        }

        communityNotificationEmailService.sendUnreadDirectMessageEmail(
                recipientId,
                fullName(senderId),
                normalizeReplyPreview(contentPreview),
                "/app/community/chat/" + conversation.getId());
    }

    private String firstCommunitySlug(Long userId) {
        if (userId == null) {
            return "";
        }

        return communityMemberRepository.findByUserId(userId).stream()
                .findFirst()
                .map(member -> member.getCommunity().getSlug())
                .orElse("");
    }
}
