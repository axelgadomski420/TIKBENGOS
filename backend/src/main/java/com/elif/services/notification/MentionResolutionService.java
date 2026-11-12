package com.elif.services.notification;

import com.elif.entities.user.User;
import com.elif.repositories.user.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@AllArgsConstructor
public class MentionResolutionService {

    private static final Pattern MENTION_PATTERN = Pattern.compile("(?<![A-Za-z0-9_])@([A-Za-z0-9._-]{2,50})");
    private static final int MAX_MENTIONS_PER_CONTENT = 20;

    private final UserRepository userRepository;

    public Set<Long> resolveMentionedUserIds(String... contents) {
        Set<String> handles = extractHandles(contents);
        Set<Long> mentionedUserIds = new LinkedHashSet<>();
        Map<String, Long> nameHandles = buildNameHandleLookup();

        for (String handle : handles) {
            userRepository.findByEmailLocalPart(handle)
                    .map(user -> user.getId())
                    .ifPresentOrElse(mentionedUserIds::add, () -> {
                        Long resolvedByName = nameHandles.get(handle);
                        if (resolvedByName != null) {
                            mentionedUserIds.add(resolvedByName);
                        }
                    });
        }

        return mentionedUserIds;
    }

    private Map<String, Long> buildNameHandleLookup() {
        Map<String, Long> lookup = new HashMap<>();

        for (User user : userRepository.findAll()) {
            if (user == null || user.getId() == null) {
                continue;
            }

            String handle = normalizeHandle((user.getFirstName() == null ? "" : user.getFirstName()) + "."
                    + (user.getLastName() == null ? "" : user.getLastName()));

            if (handle.length() < 2 || lookup.containsKey(handle)) {
                continue;
            }

            lookup.put(handle, user.getId());
        }

        return lookup;
    }

    private Set<String> extractHandles(String... contents) {
        Set<String> handles = new LinkedHashSet<>();
        if (contents == null) {
            return handles;
        }

        for (String content : contents) {
            if (content == null || content.isBlank()) {
                continue;
            }

            Matcher matcher = MENTION_PATTERN.matcher(content);
            while (matcher.find()) {
                if (handles.size() >= MAX_MENTIONS_PER_CONTENT) {
                    return handles;
                }

                String handle = matcher.group(1);
                if (handle != null && !handle.isBlank()) {
                    handles.add(handle.toLowerCase());
                }
            }
        }

        return handles;
    }

    private String normalizeHandle(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        return value.toLowerCase()
                .replaceAll("\\s+", ".")
                .replaceAll("\\.+", ".")
                .replaceAll("[^a-z0-9._-]", "")
                .replaceAll("^\\.+|\\.+$", "");
    }
}
