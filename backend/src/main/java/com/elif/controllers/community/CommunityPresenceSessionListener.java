package com.elif.controllers.community;

import com.elif.dto.community.realtime.PresenceEvent;
import com.elif.services.community.CommunityPresenceService;
import lombok.AllArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;

@Component
@AllArgsConstructor
public class CommunityPresenceSessionListener {

    private final CommunityPresenceService communityPresenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        communityPresenceService.markOffline(event.getSessionId())
                .ifPresent(state -> messagingTemplate.convertAndSend("/topic/community.presence",
                        PresenceEvent.builder()
                                .userId(state.userId())
                                .userName(state.userName())
                                .online(false)
                                .occurredAt(LocalDateTime.now())
                                .build()));
    }
}
