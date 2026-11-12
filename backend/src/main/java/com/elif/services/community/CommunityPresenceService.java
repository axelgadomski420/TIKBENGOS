package com.elif.services.community;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CommunityPresenceService {

    private final Map<String, Long> sessionToUser = new ConcurrentHashMap<>();
    private final Map<Long, String> userNames = new ConcurrentHashMap<>();
    private final Map<Long, Integer> onlineCounts = new ConcurrentHashMap<>();

    public synchronized boolean markOnline(String sessionId, Long userId, String userName) {
        if (sessionId == null || userId == null) {
            return false;
        }

        sessionToUser.put(sessionId, userId);
        userNames.put(userId, userName);
        int previous = onlineCounts.getOrDefault(userId, 0);
        onlineCounts.put(userId, previous + 1);
        return previous == 0;
    }

    public synchronized Optional<PresenceState> markOffline(String sessionId) {
        if (sessionId == null) {
            return Optional.empty();
        }

        Long userId = sessionToUser.remove(sessionId);
        if (userId == null) {
            return Optional.empty();
        }

        int previous = onlineCounts.getOrDefault(userId, 0);
        if (previous <= 1) {
            onlineCounts.remove(userId);
            String userName = userNames.getOrDefault(userId, "Unknown User");
            return Optional.of(new PresenceState(userId, userName, false));
        }

        onlineCounts.put(userId, previous - 1);
        return Optional.empty();
    }

    public Set<Long> onlineUserIds() {
        return Set.copyOf(onlineCounts.keySet());
    }

    public Optional<Long> userIdForSession(String sessionId) {
        return Optional.ofNullable(sessionToUser.get(sessionId));
    }

    public String userName(Long userId) {
        return userNames.getOrDefault(userId, "Unknown User");
    }

    public record PresenceState(Long userId, String userName, boolean online) {
    }
}
