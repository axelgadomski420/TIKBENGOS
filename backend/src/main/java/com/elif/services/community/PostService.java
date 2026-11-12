package com.elif.services.community;

import com.elif.dto.community.request.CreatePostRequest;
import com.elif.dto.community.response.PostResponse;
import com.elif.entities.community.*;
import com.elif.entities.community.enums.MemberRole;
import com.elif.entities.community.enums.PostType;
import com.elif.entities.community.enums.SortMode;
import com.elif.entities.community.enums.SortWindow;
import com.elif.entities.community.enums.TargetType;
import com.elif.entities.notification.enums.NotificationType;
import com.elif.exceptions.community.CommunityNotFoundException;
import com.elif.exceptions.community.ForbiddenActionException;
import com.elif.exceptions.community.PostNotFoundException;
import com.elif.repositories.community.CommunityMemberRepository;
import com.elif.repositories.community.CommunityRepository;
import com.elif.repositories.community.CommentRepository;
import com.elif.repositories.community.FlairRepository;
import com.elif.repositories.community.PostRepository;
import com.elif.repositories.community.VoteRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.services.notification.AppNotificationService;
import com.elif.services.notification.MentionResolutionService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class PostService {
    private static final Pattern USER_QUERY_PATTERN = Pattern
            .compile("(?:from|by)\\s+(?:user\\s+)?@?['\"]?([a-zA-Z0-9._\\-\\s]{2,80})['\"]?");
    private static final Set<String> SEARCH_STOP_WORDS = Set.of(
            "the", "and", "for", "with", "that", "this", "from", "into", "about", "what", "which", "when",
            "where", "show", "find", "need", "want", "best", "good", "help", "please", "a", "an", "to", "of",
            "in", "on", "at", "as", "by", "is", "are", "be", "or", "if", "me", "my", "we", "you", "your");

    private final PostRepository postRepository;
    private final CommunityRepository communityRepository;
    private final CommentRepository commentRepository;
    private final FlairRepository flairRepository;
    private final CommunityService communityService;
    private final SortingService sortingService;
    private final VoteRepository voteRepository;
    private final UserRepository userRepository;
    private final CommunityMemberRepository communityMemberRepository;
    private final AppNotificationService appNotificationService;
    private final MentionResolutionService mentionResolutionService;
    private final CommunityNotificationEmailService communityNotificationEmailService;

    @Value("${app.notifications.community.new-post.enabled:false}")
    private boolean communityNewPostNotificationsEnabled;

    public List<PostResponse> getPosts(Long communityId, SortMode sortMode, SortWindow sortWindow, Long flairId,
            PostType type,
            Long viewerId) {
        List<Post> posts;
        if (flairId != null) {
            posts = postRepository.findByCommunityIdAndFlairIdAndDeletedAtIsNull(communityId, flairId);
        } else if (type != null) {
            posts = postRepository.findByCommunityIdAndTypeAndDeletedAtIsNull(communityId, type);
        } else {
            posts = postRepository.findByCommunityIdAndDeletedAtIsNull(communityId);
        }

        SortMode mode = sortMode == null ? SortMode.HOT : sortMode;
        SortWindow window = sortWindow == null ? SortWindow.ALL : sortWindow;
        return toResponses(sortingService.sort(posts, mode, window), viewerId);
    }

    public PostResponse getPost(Long id, Long viewerId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));
        post.setViewCount(post.getViewCount() + 1);
        postRepository.save(post);
        return toResponse(post, viewerId);
    }

    public List<PostResponse> getTrendingPosts(SortMode sortMode, SortWindow sortWindow, Integer limit, Long viewerId) {
        SortMode mode = sortMode == null ? SortMode.HOT : sortMode;
        SortWindow window = sortWindow == null ? SortWindow.ALL : sortWindow;
        List<Post> sorted = sortingService.sort(postRepository.findByDeletedAtIsNull(), mode, window);

        if (limit != null) {
            int safeLimit = Math.max(1, Math.min(500, limit));
            sorted = sorted.stream().limit(safeLimit).toList();
        }

        return toResponses(sorted, viewerId);
    }

    public PostResponse createPost(Long communityId, Long requestUserId, Long actingUserId, CreatePostRequest req) {
        Long authorUserId = communityService.resolveActingUserId(requestUserId, actingUserId);

        if (!communityService.isAdminUser(requestUserId)) {
            MemberRole role = communityService.getUserRole(communityId, requestUserId);
            if (role == null) {
                throw new IllegalStateException("Membership required");
            }
        } else {
            communityService.ensureMembership(communityId, authorUserId, MemberRole.MEMBER);
        }

        Community community = communityRepository.findById(communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Community not found"));

        Flair flair = resolveFlair(req.getFlairId());

        Post post = Post.builder()
                .community(community)
                .userId(authorUserId)
                .title(req.getTitle())
                .content(req.getContent())
                .imageUrl(normalizeOptional(req.getImageUrl()))
                .type(req.getType() == null ? PostType.DISCUSSION : req.getType())
                .flair(flair)
                .build();

        Post saved = postRepository.save(post);
        notifyPostMentions(saved, authorUserId);
        notifyCommunityMembersAboutNewPost(saved, authorUserId);
        return toResponse(saved, requestUserId);
    }

    public PostResponse updatePost(Long postId, Long userId, CreatePostRequest req) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));

        if (!post.getUserId().equals(userId)) {
            throw new ForbiddenActionException("Only the post author can edit this post");
        }

        post.setTitle(req.getTitle());
        post.setContent(req.getContent());
        post.setImageUrl(normalizeOptional(req.getImageUrl()));
        if (req.getType() != null) {
            post.setType(req.getType());
        }
        if (req.getFlairId() != null) {
            post.setFlair(resolveFlair(req.getFlairId()));
        }

        return toResponse(postRepository.save(post), userId);
    }

    public PostResponse setPinned(Long postId, Long userId, boolean pinned) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));

        boolean isModerator = communityService.canModerate(post.getCommunity().getId(), userId);

        if (!isModerator) {
            throw new ForbiddenActionException("Only community creators or moderators can pin posts");
        }

        post.setPinnedAt(pinned ? LocalDateTime.now() : null);
        return toResponse(postRepository.save(post), userId);
    }

    public void softDeletePost(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));

        boolean isAuthor = post.getUserId().equals(userId);
        boolean isModerator = communityService.canModerate(post.getCommunity().getId(), userId);

        if (!isAuthor && !isModerator) {
            throw new ForbiddenActionException("Only the post author, creator, or moderator can delete this post");
        }

        post.setDeletedAt(LocalDateTime.now());
        postRepository.save(post);
    }

    public void hardDeletePost(Long postId, Long userId) {
        if (!communityService.isAdminUser(userId)) {
            throw new ForbiddenActionException("Only admins can hard delete posts");
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));

        voteRepository.deleteByTargetTypeAndTargetId(TargetType.POST, postId);
        commentRepository.findByPostId(postId)
                .forEach(comment -> voteRepository.deleteByTargetTypeAndTargetId(TargetType.COMMENT, comment.getId()));
        commentRepository.deleteAllByPostId(postId);
        postRepository.delete(post);
    }

    public List<PostResponse> search(String query) {
        return search(query, null);
    }

    public List<PostResponse> search(String query, Long viewerId) {
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase();
        if (normalizedQuery.isBlank()) {
            return List.of();
        }

        String requestedAuthor = extractRequestedAuthor(normalizedQuery);
        List<String> extractedTokens = extractSearchTokens(normalizedQuery);
        final List<String> searchTokens = extractedTokens.isEmpty() ? List.of(normalizedQuery) : extractedTokens;

        List<Post> allPosts = postRepository.findByDeletedAtIsNull();
        Map<Long, String> authorNames = resolveAuthorNames(allPosts);
        Map<Long, Integer> scores = new HashMap<>();
        List<Post> ranked = allPosts.stream()
                .filter(post -> {
                    String authorName = authorNames.getOrDefault(post.getUserId(), "unknown");
                    if (requestedAuthor != null && !authorName.toLowerCase(Locale.ROOT).contains(requestedAuthor)) {
                        return false;
                    }

                    int score = computeSearchScore(post, normalizedQuery, searchTokens, authorName);
                    if (score <= 0) {
                        return false;
                    }
                    scores.put(post.getId(), score);
                    return true;
                })
                .sorted(Comparator
                        .comparingInt((Post post) -> scores.getOrDefault(post.getId(), 0)).reversed()
                        .thenComparingInt(Post::getVoteScore).reversed()
                        .thenComparingInt(Post::getViewCount).reversed()
                        .thenComparing(Post::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(60)
                .toList();

        return ranked.stream().map(post -> toResponse(post, viewerId, authorNames)).toList();
    }

    private List<String> extractSearchTokens(String query) {
        return List.of(query.split("[^a-z0-9]+")).stream()
                .map(String::trim)
                .filter(token -> token.length() >= 3)
                .filter(token -> !SEARCH_STOP_WORDS.contains(token))
                .distinct()
                .toList();
    }

    private int computeSearchScore(Post post, String fullQuery, List<String> tokens, String authorName) {
        String title = normalizeOptional(post.getTitle());
        String content = normalizeOptional(post.getContent());
        String flairName = post.getFlair() == null ? null : normalizeOptional(post.getFlair().getName());
        String communitySlug = post.getCommunity() == null ? null : normalizeOptional(post.getCommunity().getSlug());
        String communityName = post.getCommunity() == null ? null : normalizeOptional(post.getCommunity().getName());

        String loweredTitle = title == null ? "" : title.toLowerCase();
        String loweredContent = content == null ? "" : content.toLowerCase();
        String loweredAuthor = authorName == null ? "" : authorName.toLowerCase(Locale.ROOT);
        String loweredFlair = flairName == null ? "" : flairName.toLowerCase(Locale.ROOT);
        String loweredCommunitySlug = communitySlug == null ? "" : communitySlug.toLowerCase(Locale.ROOT);
        String loweredCommunityName = communityName == null ? "" : communityName.toLowerCase(Locale.ROOT);

        int score = 0;
        if (loweredTitle.contains(fullQuery)) {
            score += 24;
        }
        if (loweredContent.contains(fullQuery)) {
            score += 12;
        }
        if (loweredAuthor.contains(fullQuery)) {
            score += 30;
        }
        if (loweredCommunityName.contains(fullQuery) || loweredCommunitySlug.contains(fullQuery)) {
            score += 14;
        }
        if (loweredFlair.contains(fullQuery)) {
            score += 10;
        }

        for (String token : tokens) {
            if (loweredTitle.contains(token)) {
                score += 8;
            }
            if (loweredContent.contains(token)) {
                score += 4;
            }
            if (loweredAuthor.contains(token)) {
                score += 12;
            }
            if (loweredCommunityName.contains(token) || loweredCommunitySlug.contains(token)) {
                score += 6;
            }
            if (loweredFlair.contains(token)) {
                score += 5;
            }
        }

        score += Math.min(12, Math.max(0, post.getVoteScore() / 2));
        score += Math.min(6, Math.max(0, post.getViewCount() / 80));
        return score;
    }

    private String extractRequestedAuthor(String query) {
        Matcher matcher = USER_QUERY_PATTERN.matcher(query == null ? "" : query);
        if (!matcher.find()) {
            return null;
        }
        String value = normalizeOptional(matcher.group(1));
        if (value == null) {
            return null;
        }
        return value.toLowerCase(Locale.ROOT);
    }

    private List<PostResponse> toResponses(List<Post> posts, Long viewerId) {
        Map<Long, String> authorNames = resolveAuthorNames(posts);
        return posts.stream().map(post -> toResponse(post, viewerId, authorNames)).toList();
    }

    private Map<Long, String> resolveAuthorNames(List<Post> posts) {
        Set<Long> authorIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());
        if (authorIds.isEmpty()) {
            return Map.of();
        }

        return userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(com.elif.entities.user.User::getId,
                        user -> formatAuthorName(user.getFirstName(), user.getLastName())));
    }

    private PostResponse toResponse(Post post, Long viewerId) {
        return toResponse(post, viewerId, resolveAuthorNames(List.of(post)));
    }

    private PostResponse toResponse(Post post, Long viewerId, Map<Long, String> authorNames) {
        return PostResponse.builder()
                .id(post.getId())
                .communityId(post.getCommunity().getId())
                .communitySlug(post.getCommunity().getSlug())
                .userId(post.getUserId())
                .authorName(authorNames.getOrDefault(post.getUserId(), "Unknown"))
                .title(post.getTitle())
                .content(post.isDeleted() ? "[deleted]" : post.getContent())
                .imageUrl(post.isDeleted() ? null : post.getImageUrl())
                .type(post.getType())
                .flairId(post.getFlair() == null ? null : post.getFlair().getId())
                .flairName(post.getFlair() == null ? null : post.getFlair().getName())
                .voteScore(post.getVoteScore())
                .userVote(resolveUserVote(viewerId, post.getId(), TargetType.POST))
                .viewCount(post.getViewCount())
                .commentCount(commentRepository.countByPostIdAndDeletedAtIsNull(post.getId()))
                .pinned(post.isPinned())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    private Integer resolveUserVote(Long viewerId, Long targetId, TargetType targetType) {
        if (viewerId == null) {
            return null;
        }

        return voteRepository.findByUserIdAndTargetIdAndTargetType(viewerId, targetId, targetType)
                .map(Vote::getValue)
                .orElse(null);
    }

    private Flair resolveFlair(Long flairId) {
        if (flairId == null) {
            return null;
        }

        return flairRepository.findById(flairId)
                .orElseThrow(() -> new IllegalArgumentException("Flair not found"));
    }

    private String formatAuthorName(String firstName, String lastName) {
        String normalizedFirst = normalizeOptional(firstName);
        String normalizedLast = normalizeOptional(lastName);

        String joined = String.join(" ",
                normalizedFirst == null ? "" : normalizedFirst,
                normalizedLast == null ? "" : normalizedLast).trim();

        return joined.isEmpty() ? "Unknown" : joined;
    }

    private String normalizeOptional(String value) {
        if (value == null)
            return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void notifyCommunityMembersAboutNewPost(Post post, Long authorUserId) {
        if (!communityNewPostNotificationsEnabled) {
            return;
        }

        String authorName = resolveAuthorName(authorUserId);
        String communitySlug = post.getCommunity().getSlug();
        String deepLink = "/app/community/post/" + post.getId();
        String title = "New post in c/" + communitySlug;
        String message = authorName + " posted: " + trimForPreview(post.getTitle(), 90);

        communityMemberRepository.findByCommunityId(post.getCommunity().getId()).stream()
                .filter(member -> member.getUserId() != null && !member.getUserId().equals(authorUserId))
                .forEach(member -> {
                    Long recipientId = member.getUserId();
                    appNotificationService.create(
                            recipientId,
                            authorUserId,
                            NotificationType.COMMUNITY_POST_CREATED,
                            title,
                            message,
                            deepLink,
                            "POST",
                            post.getId());
                    communityNotificationEmailService.sendNewPostEmail(
                            recipientId,
                            post.getCommunity().getName(),
                            communitySlug,
                            authorName,
                            trimForPreview(post.getTitle(), 90),
                            deepLink);
                });
    }

    private String resolveAuthorName(Long userId) {
        if (userId == null) {
            return "Someone";
        }

        return userRepository.findById(userId)
                .map(user -> formatAuthorName(user.getFirstName(), user.getLastName()))
                .orElse("Someone");
    }

    private String trimForPreview(String value, int maxLength) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            return "a new post";
        }

        if (normalized.length() <= maxLength) {
            return normalized;
        }

        return normalized.substring(0, Math.max(0, maxLength - 3)) + "...";
    }

    private void notifyPostMentions(Post post, Long actorUserId) {
        if (post == null || actorUserId == null) {
            return;
        }

        String deepLink = "/app/community/post/" + post.getId();
        String communityName = post.getCommunity() != null ? post.getCommunity().getName() : "your community";
        String communitySlug = post.getCommunity() != null ? post.getCommunity().getSlug() : "";
        String actorName = resolveAuthorName(actorUserId);
        String mentionMessage = actorName + " mentioned you in: " + trimForPreview(post.getTitle(), 90);

        mentionResolutionService.resolveMentionedUserIds(post.getTitle(), post.getContent()).stream()
                .filter(mentionedUserId -> mentionedUserId != null && !mentionedUserId.equals(actorUserId))
                .forEach(mentionedUserId -> {
                    appNotificationService.create(
                            mentionedUserId,
                            actorUserId,
                            NotificationType.COMMUNITY_POST_MENTION,
                            "You were mentioned in a post",
                            mentionMessage,
                            deepLink,
                            "POST",
                            post.getId());
                    communityNotificationEmailService.sendMentionEmail(
                            post.getCommunity().getId(),
                            mentionedUserId,
                            communityName,
                            actorName,
                            mentionMessage,
                            deepLink,
                            communitySlug);
                });
    }
}
