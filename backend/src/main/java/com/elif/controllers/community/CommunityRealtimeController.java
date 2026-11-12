package com.elif.controllers.community;

import com.elif.dto.community.realtime.PresenceConnectRequest;
import com.elif.dto.community.realtime.PresenceEvent;
import com.elif.dto.community.realtime.TypingEvent;
import com.elif.dto.community.realtime.TypingRequest;
import com.elif.repositories.user.UserRepository;
import com.elif.services.community.CommunityPresenceService;
import com.elif.services.community.MessagingService;
import lombok.AllArgsConstructor;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
@AllArgsConstructor
public class CommunityRealtimeController {

    private final CommunityPresenceService communityPresenceService;
    private final MessagingService messagingService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @MessageMapping("/community/presence.connect")
    public void connectPresence(PresenceConnectRequest request, @Header("simpSessionId") String sessionId) {
        if (request == null || request.getUserId() == null) {
            return;
        }

        String userName = userRepository.findById(request.getUserId())
                .map(u -> u.getFirstName() + " " + u.getLastName())
                .orElse("Unknown User");

        boolean firstSession = communityPresenceService.markOnline(sessionId, request.getUserId(), userName);
        if (!firstSession) {
            return;
        }

        messagingTemplate.convertAndSend("/topic/community.presence", PresenceEvent.builder()
                .userId(request.getUserId())
                .userName(userName)
                .online(true)
                .occurredAt(LocalDateTime.now())
                .build());
    }

    @MessageMapping("/community/typing")
    public void typing(TypingRequest request, @Header("simpSessionId") String sessionId) {
        if (request == null || request.getConversationId() == null) {
            return;
        }

        Long senderId = communityPresenceService.userIdForSession(sessionId).orElse(null);
        if (senderId == null || !messagingService.isParticipant(request.getConversationId(), senderId)) {
            return;
        }

        messagingTemplate.convertAndSend(
                "/topic/community.conversation." + request.getConversationId() + ".typing",
                TypingEvent.builder()
                        .conversationId(request.getConversationId())
                        .senderId(senderId)
                        .senderName(communityPresenceService.userName(senderId))
                        .typing(request.isTyping())
                        .occurredAt(LocalDateTime.now())
                        .build());
    }
}
