package com.elif.services.community;

import com.elif.dto.community.request.CreateCommentRequest;
import com.elif.dto.community.response.CommentResponse;
import com.elif.entities.community.Comment;
import com.elif.entities.community.Post;
import com.elif.entities.community.Vote;
import com.elif.entities.community.enums.PostType;
import com.elif.entities.community.enums.TargetType;
import com.elif.entities.notification.enums.NotificationType;
import com.elif.exceptions.community.ForbiddenActionException;
import com.elif.exceptions.community.PostNotFoundException;
import com.elif.repositories.community.CommentRepository;
import com.elif.repositories.community.PostRepository;
import com.elif.repositories.community.VoteRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.services.notification.AppNotificationService;
import com.elif.services.notification.MentionResolutionService;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
@Transactional
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final CommunityService communityService;
    private final UserRepository userRepository;
    private final VoteRepository voteRepository;
    private final AppNotificationService appNotificationService;
    private final MentionResolutionService mentionResolutionService;
    private final CommunityNotificationEmailService communityNotificationEmailService;

    public List<CommentResponse> getCommentTree(Long postId, Long viewerId) {
        List<Comment> flat = commentRepository.findByPostIdAndDeletedAtIsNullOrderByCreatedAtAsc(postId);
        return buildTree(flat, viewerId);
    }

    public CommentResponse createComment(Long postId, Long userId, CreateCommentRequest req) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));

        Comment parent = null;
        if (req.getParentCommentId() != null) {
            parent = commentRepository.findById(req.getParentCommentId())
                    .orElseThrow(() -> new IllegalArgumentException("Parent comment not found"));
            if (!parent.getPost().getId().equals(postId)) {
                throw new IllegalArgumentException("Parent comment does not belong to this post");
            }
        }

        Comment saved = commentRepository.save(Comment.builder()
                .post(post)
                .parentComment(parent)
                .userId(userId)
                .content(normalizeContent(req.getContent()))
                .imageUrl(normalizeOptional(req.getImageUrl()))
                .build());

        notifyUsersForNewComment(saved, userId);

        return toResponse(saved, userId);
    }

    public CommentResponse updateComment(Long commentId, Long userId, CreateCommentRequest req) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        if (!comment.getUserId().equals(userId)) {
            throw new ForbiddenActionException("Only the comment author can edit this comment");
        }

        comment.setContent(normalizeContent(req.getContent()));
        comment.setImageUrl(normalizeOptional(req.getImageUrl()));
        return toResponse(commentRepository.save(comment), userId);
    }

    public void softDeleteComment(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        boolean isAuthor = comment.getUserId().equals(userId);
        boolean isModerator = communityService.canModerate(comment.getPost().getCommunity().getId(), userId);

        if (!isAuthor && !isModerator) {
            throw new ForbiddenActionException(
                    "Only the comment author, creator, or moderator can delete this comment");
        }

        comment.setDeletedAt(LocalDateTime.now());
        commentRepository.save(comment);
    }

    public void acceptAnswer(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        Post post = comment.getPost();
        if (!post.getUserId().equals(userId)) {
            throw new ForbiddenActionException("Only the post author can accept an answer");
        }
        if (post.getType() != PostType.QUESTION) {
            throw new IllegalStateException("Accepted answer is only for QUESTION posts");
        }

        List<Comment> acceptedComments = commentRepository.findByPostIdAndAcceptedAnswerTrue(post.getId());
        if (!acceptedComments.isEmpty()) {
            for (Comment acceptedComment : acceptedComments) {
                acceptedComment.setAcceptedAnswer(false);
            }
            commentRepository.saveAll(acceptedComments);
        }
        comment.setAcceptedAnswer(true);
        commentRepository.save(comment);
    }

    private List<CommentResponse> buildTree(List<Comment> comments, Long viewerId) {
        Map<Long, CommentResponse> byId = new LinkedHashMap<>();
        List<CommentResponse> roots = new ArrayList<>();
        Map<Long, String> authorNames = resolveAuthorNames(comments);

        for (Comment c : comments) {
            byId.put(c.getId(), toResponse(c, viewerId, authorNames));
        }

        for (Comment c : comments) {
            CommentResponse current = byId.get(c.getId());
            if (c.getParentComment() == null) {
                roots.add(current);
            } else {
                CommentResponse parent = byId.get(c.getParentComment().getId());
                if (parent != null) {
                    parent.getReplies().add(current);
                }
            }
        }

        return roots;
    }

    private Map<Long, String> resolveAuthorNames(List<Comment> comments) {
        Set<Long> authorIds = comments.stream().map(Comment::getUserId).collect(Collectors.toSet());
        if (authorIds.isEmpty()) {
            return Map.of();
        }

        return userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(com.elif.entities.user.User::getId,
                        user -> formatAuthorName(user.getFirstName(), user.getLastName())));
    }

    private CommentResponse toResponse(Comment comment, Long viewerId) {
        return toResponse(comment, viewerId, Map.of(comment.getUserId(), resolveAuthorName(comment.getUserId())));
    }

    private CommentResponse toResponse(Comment comment, Long viewerId, Map<Long, String> authorNames) {
        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .parentCommentId(comment.getParentComment() == null ? null : comment.getParentComment().getId())
                .userId(comment.getUserId())
                .authorName(authorNames.getOrDefault(comment.getUserId(), "Unknown"))
                .content(comment.isDeleted() ? "[deleted]" : comment.getContent())
                .imageUrl(comment.isDeleted() ? null : comment.getImageUrl())
                .voteScore(comment.getVoteScore())
                .userVote(resolveUserVote(viewerId, comment.getId(), TargetType.COMMENT))
                .acceptedAnswer(comment.isAcceptedAnswer())
                .createdAt(comment.getCreatedAt())
                .build();
    }

    private String formatAuthorName(String firstName, String lastName) {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        String full = (first + " " + last).trim();
        return full.isEmpty() ? "Unknown" : full;
    }

    private String resolveAuthorName(Long userId) {
        if (userId == null) {
            return "Unknown";
        }

        return userRepository.findById(userId)
                .map(user -> formatAuthorName(user.getFirstName(), user.getLastName()))
                .orElse("Unknown");
    }

    private Integer resolveUserVote(Long viewerId, Long targetId, TargetType targetType) {
        if (viewerId == null) {
            return null;
        }

        return voteRepository.findByUserIdAndTargetIdAndTargetType(viewerId, targetId, targetType)
                .map(Vote::getValue)
                .orElse(null);
    }

    private String normalizeOptional(String value) {
        if (value == null)
            return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeContent(String value) {
        if (value == null)
            return "";
        return value.trim();
    }

    private void notifyUsersForNewComment(Comment comment, Long actorUserId) {
        if (comment == null || comment.getPost() == null || actorUserId == null) {
            return;
        }

        Post post = comment.getPost();
        Set<Long> notifiedUsers = new HashSet<>();
        String actorName = resolveAuthorName(actorUserId);
        String postDeepLink = "/app/community/post/" + post.getId();
        String commentDeepLink = postDeepLink + "#comment-" + comment.getId();
        String communityName = post.getCommunity() != null ? post.getCommunity().getName() : "your community";
        String communitySlug = post.getCommunity() != null ? post.getCommunity().getSlug() : "";

        mentionResolutionService.resolveMentionedUserIds(comment.getContent()).stream()
                .filter(mentionedUserId -> mentionedUserId != null && !mentionedUserId.equals(actorUserId))
                .forEach(mentionedUserId -> {
                    appNotificationService.create(
                            mentionedUserId,
                            actorUserId,
                            NotificationType.COMMUNITY_COMMENT_MENTION,
                            "You were mentioned in a comment",
                            actorName + " mentioned you in a comment",
                            commentDeepLink,
                            "COMMENT",
                            comment.getId());
                    communityNotificationEmailService.sendMentionEmail(
                            post.getCommunity().getId(),
                            mentionedUserId,
                            communityName,
                            actorName,
                            actorName + " mentioned you in a comment on " + trimForPreview(post.getTitle(), 90),
                            commentDeepLink,
                            communitySlug);
                    notifiedUsers.add(mentionedUserId);
                });

        if (comment.getParentComment() != null) {
            Long parentAuthorId = comment.getParentComment().getUserId();
            if (parentAuthorId != null && !parentAuthorId.equals(actorUserId)) {
                appNotificationService.create(
                        parentAuthorId,
                        actorUserId,
                        NotificationType.COMMUNITY_COMMENT_REPLY,
                        "New reply to your comment",
                        actorName + " replied to your comment",
                        commentDeepLink,
                        "COMMENT",
                        comment.getId());
                notifiedUsers.add(parentAuthorId);
            }
        }

        Long postAuthorId = post.getUserId();
        if (postAuthorId != null && !postAuthorId.equals(actorUserId) && !notifiedUsers.contains(postAuthorId)) {
            appNotificationService.create(
                    postAuthorId,
                    actorUserId,
                    NotificationType.COMMUNITY_POST_COMMENT,
                    "New comment on your post",
                    actorName + " commented on: " + trimForPreview(post.getTitle(), 90),
                    commentDeepLink,
                    "POST",
                    post.getId());
            communityNotificationEmailService.sendPostReplyEmail(
                    post.getCommunity().getId(),
                    postAuthorId,
                    communityName,
                    actorName,
                    trimForPreview(post.getTitle(), 90),
                    commentDeepLink,
                    communitySlug);
        }
    }

    private String trimForPreview(String value, int maxLength) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            return "your post";
        }

        if (normalized.length() <= maxLength) {
            return normalized;
        }

        return normalized.substring(0, Math.max(0, maxLength - 3)) + "...";
    }
}
