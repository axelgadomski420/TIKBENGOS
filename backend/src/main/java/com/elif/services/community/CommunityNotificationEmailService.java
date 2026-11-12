package com.elif.services.community;

import com.elif.entities.community.Community;
import com.elif.entities.community.CommunityMember;
import com.elif.entities.community.Post;
import com.elif.entities.user.User;
import com.elif.repositories.community.CommentRepository;
import com.elif.repositories.community.CommunityMemberRepository;
import com.elif.repositories.community.PostRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.services.email.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityNotificationEmailService {

    private final EmailService emailService;
    private final TemplateEngine templateEngine;
    private final CommunityMemberRepository communityMemberRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    @Value("${app.frontend.base-url:http://localhost:4200}")
    private String baseUrl;

    private static final DateTimeFormatter DIGEST_DATE_FORMAT =
            DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);

    @Async
    public void sendPostReplyEmail(Long communityId,
            Long recipientUserId,
            String communityName,
            String actorName,
            String postTitle,
            String targetPath,
            String communitySlug) {
        withEnabledMemberPreference(communityId, recipientUserId, CommunityMember::isEmailOnPostReply)
                .ifPresent(member -> userRepository.findById(recipientUserId)
                        .ifPresent(user -> sendSingleNotificationEmail(
                                user,
                                communityName,
                                communitySlug,
                                "Reply to your post",
                                actorName + " replied in " + communityName,
                                "Someone replied to your post",
                                List.of(
                                        actorName + " joined the conversation on your post.",
                                        "Post: " + safeText(postTitle),
                                        "Open the thread to read the new comment and reply back if you want to keep the discussion moving."),
                                "Open discussion",
                                targetPath)));
    }

    @Async
    public void sendMentionEmail(Long communityId,
            Long recipientUserId,
            String communityName,
            String actorName,
            String mentionContext,
            String targetPath,
            String communitySlug) {
        withEnabledMemberPreference(communityId, recipientUserId, CommunityMember::isEmailOnMention)
                .ifPresent(member -> userRepository.findById(recipientUserId)
                        .ifPresent(user -> sendSingleNotificationEmail(
                                user,
                                communityName,
                                communitySlug,
                                "You were mentioned",
                                actorName + " mentioned you in " + communityName,
                                "You were mentioned",
                                List.of(
                                        actorName + " mentioned you in a community conversation.",
                                        safeText(mentionContext),
                                        "Open Elif to jump straight to the post, comment, or chat thread."),
                                "View mention",
                                targetPath)));
    }

    @Async
    public void sendUnreadDirectMessageEmail(Long recipientUserId,
            String actorName,
            String messagePreview,
            String targetPath) {
        withGlobalUnreadMessagePreference(recipientUserId)
                .ifPresent(member -> userRepository.findById(recipientUserId)
                        .ifPresent(user -> sendSingleNotificationEmail(
                                user,
                                member.getCommunity().getName(),
                                member.getCommunity().getSlug(),
                                "Unread direct message",
                                actorName + " sent you a message",
                                "You have an unread direct message",
                                List.of(
                                        actorName + " sent you a message on Elif.",
                                        safeText(messagePreview),
                                        "Open the conversation when you are ready so unread messages do not pile up."),
                                "Open inbox",
                                targetPath)));
    }

    @Async
    public void sendNewPostEmail(Long recipientUserId,
            String communityName,
            String communitySlug,
            String actorName,
            String postTitle,
            String targetPath) {
        if (!isMailConfigured() || recipientUserId == null) {
            return;
        }

        userRepository.findById(recipientUserId)
                .filter(user -> !isBlank(user.getEmail()))
                .ifPresent(user -> sendSingleNotificationEmail(
                        user,
                        communityName,
                        communitySlug,
                        "New post",
                        actorName + " posted in " + communityName,
                        "A new post was published",
                        List.of(
                                actorName + " shared a new post in " + communityName + ".",
                                "Post: " + safeText(postTitle),
                                "Open the discussion to read it and join the conversation."),
                        "Open post",
                        targetPath));
    }

    @Async
    public void sendWeeklyDigestEmail(CommunityMember member) {
        if (member == null || !member.isWeeklyDigestEnabled()) {
            return;
        }
        if (!isMailConfigured()) {
            return;
        }

        User user = userRepository.findById(member.getUserId()).orElse(null);
        if (user == null || isBlank(user.getEmail())) {
            return;
        }

        Community community = member.getCommunity();
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<DigestPostView> posts = postRepository.findByCommunityIdAndDeletedAtIsNull(community.getId()).stream()
                .filter(post -> post.getCreatedAt() != null && !post.getCreatedAt().isBefore(since))
                .sorted(Comparator.comparingInt(Post::getVoteScore).reversed()
                        .thenComparing(Post::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .map(this::toDigestView)
                .toList();

        if (posts.isEmpty()) {
            return;
        }

        Context context = new Context(Locale.ENGLISH);
        context.setVariable("headline", community.getName() + " weekly digest");
        context.setVariable("communityName", community.getName());
        context.setVariable("firstName", firstName(user));
        context.setVariable("digestRange", DIGEST_DATE_FORMAT.format(since) + " - " + DIGEST_DATE_FORMAT.format(LocalDateTime.now()));
        context.setVariable("posts", posts);
        context.setVariable("communityUrl", absoluteUrl("/app/community/c/" + community.getSlug()));
        context.setVariable("manageUrl", notificationSettingsUrl(community.getSlug()));
        context.setVariable("baseUrl", baseUrl);

        sendTemplate(user.getEmail(), "Elif community digest - " + community.getName(), "emails/community-weekly-digest", context);
    }

    private DigestPostView toDigestView(Post post) {
        String authorName = userRepository.findById(post.getUserId())
                .map(this::fullName)
                .orElse("Community member");
        long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getId());
        return new DigestPostView(
                safeText(post.getTitle()),
                excerpt(post.getContent(), 150),
                authorName,
                post.getVoteScore(),
                commentCount,
                post.getCreatedAt() == null ? "Recent" : DIGEST_DATE_FORMAT.format(post.getCreatedAt()),
                absoluteUrl("/app/community/post/" + post.getId()));
    }

    private void sendSingleNotificationEmail(User user,
            String communityName,
            String communitySlug,
            String eyebrow,
            String title,
            String headline,
            List<String> bodyLines,
            String ctaLabel,
            String targetPath) {
        if (!isMailConfigured() || user == null || isBlank(user.getEmail())) {
            return;
        }

        Context context = new Context(Locale.ENGLISH);
        context.setVariable("preheader", title + " on Elif");
        context.setVariable("eyebrow", eyebrow);
        context.setVariable("headline", headline);
        context.setVariable("firstName", firstName(user));
        context.setVariable("communityName", communityName);
        context.setVariable("bodyLines", bodyLines);
        context.setVariable("ctaLabel", ctaLabel);
        context.setVariable("ctaUrl", absoluteUrl(targetPath));
        context.setVariable("manageUrl", notificationSettingsUrl(communitySlug));
        context.setVariable("baseUrl", baseUrl);

        sendTemplate(user.getEmail(), "Elif - " + title, "emails/community-notification", context);
    }

    private void sendTemplate(String toEmail, String subject, String template, Context context) {
        try {
            emailService.sendHtmlEmail(toEmail, subject, templateEngine.process(template, context));
        } catch (Exception ex) {
            log.error("Failed to send community notification email to {}", toEmail, ex);
        }
    }

    private Optional<CommunityMember> withEnabledMemberPreference(Long communityId,
            Long userId,
            java.util.function.Predicate<CommunityMember> predicate) {
        if (userId == null || !isMailConfigured()) {
            return Optional.empty();
        }

        if (communityId == null) {
            return communityMemberRepository.findByUserId(userId).stream()
                    .filter(predicate)
                    .findFirst();
        }

        return communityMemberRepository.findByCommunityIdAndUserId(communityId, userId)
                .filter(predicate);
    }

    private Optional<CommunityMember> withGlobalUnreadMessagePreference(Long userId) {
        if (userId == null || !isMailConfigured()) {
            return Optional.empty();
        }

        return communityMemberRepository.findByUserId(userId).stream()
                .filter(CommunityMember::isEmailOnUnreadDirectMessage)
                .findFirst();
    }

    private String notificationSettingsUrl(String communitySlug) {
        return absoluteUrl("/app/community/c/" + communitySlug + "?settings=notifications");
    }

    private String absoluteUrl(String path) {
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        return normalizedBase + normalizedPath;
    }

    private boolean isMailConfigured() {
        return emailService.isConfigured();
    }

    private String firstName(User user) {
        if (user == null || isBlank(user.getFirstName())) {
            return "there";
        }
        return user.getFirstName().trim();
    }

    private String fullName(User user) {
        if (user == null) {
            return "Community member";
        }
        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String full = (first + " " + last).trim();
        return full.isEmpty() ? "Community member" : full;
    }

    private String excerpt(String value, int maxLength) {
        if (isBlank(value)) {
            return "Open the app to see the full discussion.";
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, Math.max(0, maxLength - 3)) + "...";
    }

    private String safeText(String value) {
        return isBlank(value) ? "Open Elif for the latest update." : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record DigestPostView(
            String title,
            String excerpt,
            String authorName,
            int voteScore,
            long commentCount,
            String dateLabel,
            String postUrl) {
    }
}
