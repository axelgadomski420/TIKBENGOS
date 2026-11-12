package com.elif.services.community;

import com.elif.dto.community.request.CreateCommunityRequest;
import com.elif.dto.community.request.DirectMessageNotificationPreferencesRequest;
import com.elif.dto.community.request.CommunityNotificationPreferencesRequest;
import com.elif.dto.community.response.CommunityMemberResponse;
import com.elif.dto.community.response.DirectMessageNotificationPreferencesResponse;
import com.elif.dto.community.response.CommunityNotificationPreferencesResponse;
import com.elif.dto.community.response.CommunityResponse;
import com.elif.entities.community.*;
import com.elif.entities.community.enums.CommunityType;
import com.elif.entities.community.enums.MemberRole;
import com.elif.entities.community.enums.TargetType;
import com.elif.entities.user.Role;
import com.elif.exceptions.community.CommunityNotFoundException;
import com.elif.exceptions.community.NotMemberException;
import com.elif.exceptions.community.UnauthorizedModeratorException;
import com.elif.repositories.community.*;
import com.elif.repositories.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@AllArgsConstructor
@Transactional
public class CommunityService {

    private static final int MAX_IMAGE_PAYLOAD_LENGTH = 1_500_000;

    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository memberRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final CommunityRuleRepository ruleRepository;
    private final FlairRepository flairRepository;
    private final VoteRepository voteRepository;
    private final UserRepository userRepository;

    public List<CommunityResponse> findPublicCommunities(Long userId) {
        List<Community> visibleCommunities = new java.util.ArrayList<>(communityRepository.findByTypeOrderByMemberCountDesc(CommunityType.PUBLIC));

        if (userId != null) {
            List<Long> joinedCommunityIds = memberRepository.findByUserId(userId).stream()
                    .map(member -> member.getCommunity().getId())
                    .toList();

            if (!joinedCommunityIds.isEmpty()) {
                communityRepository.findAllById(joinedCommunityIds).stream()
                        .filter(community -> visibleCommunities.stream().noneMatch(existing -> existing.getId().equals(community.getId())))
                        .forEach(visibleCommunities::add);
            }
        }

        visibleCommunities.sort(Comparator
                .comparing((Community community) -> community.getMemberCount(), Comparator.reverseOrder())
                .thenComparing(Community::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        return visibleCommunities.stream()
                .map(c -> toResponse(c, userId))
                .toList();
    }

    public CommunityResponse getBySlug(String slug, Long userId) {
        Community c = communityRepository.findBySlug(slug)
                .orElseThrow(() -> new CommunityNotFoundException("Community not found"));
        return toResponse(c, userId);
    }

    public CommunityResponse createCommunity(CreateCommunityRequest req, Long requestUserId, Long actingUserId) {
        Long creatorId = resolveActingUserId(requestUserId, actingUserId);

        String slug = req.getName().trim().toLowerCase().replaceAll("\\s+", "-");
        if (communityRepository.existsBySlug(slug)) {
            throw new IllegalStateException("Community slug already exists");
        }

        Community community = Community.builder()
                .name(req.getName())
                .slug(slug)
                .description(req.getDescription())
                .type(req.getType() == null ? CommunityType.PUBLIC : req.getType())
                .createdBy(creatorId)
                .bannerUrl(normalizeOptional(req.getBannerUrl()))
                .iconUrl(normalizeOptional(req.getIconUrl()))
                .build();

        community = communityRepository.save(community);

        memberRepository.save(CommunityMember.builder()
                .community(community)
                .userId(creatorId)
                .role(MemberRole.CREATOR)
                .emailOnUnreadDirectMessage(resolveDirectMessageEmailPreference(creatorId))
                .build());
        adjustMemberCount(community.getId(), 1);

        return toResponse(communityRepository.findById(community.getId()).orElse(community), requestUserId);
    }

    public CommunityResponse updateCommunity(Long communityId, CreateCommunityRequest req, Long userId) {
        requireModerator(communityId, userId);

        Community community = communityRepository.findById(communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Community not found"));

        if (req.getName() != null && !req.getName().trim().isEmpty()) {
            community.setName(req.getName().trim());
        }
        if (req.getDescription() != null) {
            community.setDescription(req.getDescription().trim());
        }
        if (req.getType() != null) {
            community.setType(req.getType());
        }
        if (req.getBannerUrl() != null) {
            community.setBannerUrl(normalizeOptional(req.getBannerUrl()));
        }
        if (req.getIconUrl() != null) {
            community.setIconUrl(normalizeOptional(req.getIconUrl()));
        }

        return toResponse(communityRepository.save(community), userId);
    }

    public List<CommunityMemberResponse> getMembers(Long communityId, Long userId) {
        if (!isAdmin(userId)) {
            // Any member can view the member list.
            getUserRole(communityId, userId);
        }

        List<CommunityMember> members = memberRepository.findByCommunityId(communityId);
        if (members.isEmpty()) {
            return List.of();
        }

        Set<Long> memberUserIds = members.stream()
                .map(CommunityMember::getUserId)
                .collect(java.util.stream.Collectors.toSet());

        Map<Long, com.elif.entities.user.User> usersById = new HashMap<>();
        userRepository.findAllById(memberUserIds)
                .forEach(user -> usersById.put(user.getId(), user));

        List<CommunityMember> orphanMembers = members.stream()
                .filter(member -> !usersById.containsKey(member.getUserId()))
                .toList();

        if (!orphanMembers.isEmpty()) {
            memberRepository.deleteAll(orphanMembers);
            adjustMemberCount(communityId, -orphanMembers.size());
            members = members.stream()
                    .filter(member -> usersById.containsKey(member.getUserId()))
                    .toList();
        }

        return members.stream()
                .map(m -> CommunityMemberResponse.builder()
                        .userId(m.getUserId())
                        .name(fullName(usersById.get(m.getUserId())))
                        .role(m.getRole())
                        .joinedAt(m.getJoinedAt())
                        .build())
                .toList();
    }

    public void joinCommunity(Long communityId, Long userId) {
        requireExistingUser(userId);

        Community c = communityRepository.findById(communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Community not found"));

        if (memberRepository.existsByCommunityIdAndUserId(communityId, userId)) {
            throw new IllegalStateException("Already a member");
        }

        if (c.getType() == CommunityType.PRIVATE) {
            throw new IllegalStateException("Private community requires approval");
        }

        memberRepository.save(CommunityMember.builder()
                .community(c)
                .userId(userId)
                .role(MemberRole.MEMBER)
                .emailOnUnreadDirectMessage(resolveDirectMessageEmailPreference(userId))
                .build());
        adjustMemberCount(communityId, 1);
    }

    public void leaveCommunity(Long communityId, Long userId) {
        CommunityMember m = memberRepository.findByCommunityIdAndUserId(communityId, userId)
                .orElseThrow(() -> new NotMemberException("Not a member"));

        if (m.getRole() == MemberRole.CREATOR) {
            throw new IllegalStateException("Creator cannot leave without transferring ownership");
        }

        memberRepository.delete(m);
        adjustMemberCount(communityId, -1);
    }

    public MemberRole getUserRole(Long communityId, Long userId) {
        return memberRepository.findByCommunityIdAndUserId(communityId, userId)
                .map(CommunityMember::getRole)
                .orElseThrow(() -> new NotMemberException("User is not a member"));
    }

    public void requireModerator(Long communityId, Long userId) {
        if (isAdmin(userId)) {
            return;
        }

        MemberRole role = getUserRole(communityId, userId);
        if (role == MemberRole.MEMBER) {
            throw new UnauthorizedModeratorException("Moderator or Creator role required");
        }
    }

    public void removeMember(Long communityId, Long targetUserId, Long actingUserId) {
        requireModerator(communityId, actingUserId);

        CommunityMember target = memberRepository.findByCommunityIdAndUserId(communityId, targetUserId)
                .orElseThrow(() -> new NotMemberException("Target user is not a member"));

        if (target.getRole() == MemberRole.CREATOR) {
            throw new IllegalStateException("Cannot remove community creator");
        }

        if (targetUserId.equals(actingUserId)) {
            throw new IllegalStateException("Use leave action to remove yourself");
        }

        memberRepository.delete(target);
        adjustMemberCount(communityId, -1);
    }

    public void promoteToModerator(Long communityId, Long targetUserId, Long actingUserId) {
        requireCreatorOrAdmin(communityId, actingUserId);
        requireExistingUser(targetUserId);

        CommunityMember target = memberRepository.findByCommunityIdAndUserId(communityId, targetUserId)
                .orElseThrow(() -> new NotMemberException("Target user is not a member"));

        if (target.getRole() == MemberRole.CREATOR) {
            throw new IllegalStateException("Creator role cannot be changed");
        }

        if (target.getRole() == MemberRole.MODERATOR) {
            return;
        }

        target.setRole(MemberRole.MODERATOR);
        memberRepository.save(target);
    }

    public void demoteModerator(Long communityId, Long targetUserId, Long actingUserId) {
        requireCreatorOrAdmin(communityId, actingUserId);

        CommunityMember target = memberRepository.findByCommunityIdAndUserId(communityId, targetUserId)
                .orElseThrow(() -> new NotMemberException("Target user is not a member"));

        if (target.getRole() == MemberRole.CREATOR) {
            throw new IllegalStateException("Creator role cannot be changed");
        }

        if (target.getRole() == MemberRole.MEMBER) {
            return;
        }

        target.setRole(MemberRole.MEMBER);
        memberRepository.save(target);
    }

    public CommunityNotificationPreferencesResponse getNotificationPreferences(Long communityId, Long userId) {
        CommunityMember member = memberRepository.findByCommunityIdAndUserId(communityId, userId)
                .orElseThrow(() -> new NotMemberException("Join this community to manage notifications"));

        return toNotificationPreferencesResponse(member);
    }

    public CommunityNotificationPreferencesResponse updateNotificationPreferences(Long communityId,
            Long userId,
            CommunityNotificationPreferencesRequest request) {
        CommunityMember member = memberRepository.findByCommunityIdAndUserId(communityId, userId)
                .orElseThrow(() -> new NotMemberException("Join this community to manage notifications"));

        if (request.getEmailOnPostReply() != null) {
            member.setEmailOnPostReply(request.getEmailOnPostReply());
        }
        if (request.getEmailOnMention() != null) {
            member.setEmailOnMention(request.getEmailOnMention());
        }
        if (request.getWeeklyDigestEnabled() != null) {
            member.setWeeklyDigestEnabled(request.getWeeklyDigestEnabled());
        }

        return toNotificationPreferencesResponse(memberRepository.save(member));
    }

    public DirectMessageNotificationPreferencesResponse getDirectMessageNotificationPreferences(Long userId) {
        return DirectMessageNotificationPreferencesResponse.builder()
                .emailOnUnreadDirectMessage(resolveDirectMessageEmailPreference(userId))
                .build();
    }

    public DirectMessageNotificationPreferencesResponse updateDirectMessageNotificationPreferences(
            Long userId,
            DirectMessageNotificationPreferencesRequest request) {
        boolean enabled = request.getEmailOnUnreadDirectMessage() == null
                ? resolveDirectMessageEmailPreference(userId)
                : request.getEmailOnUnreadDirectMessage();

        memberRepository.findByUserId(userId)
                .forEach(member -> member.setEmailOnUnreadDirectMessage(enabled));

        return DirectMessageNotificationPreferencesResponse.builder()
                .emailOnUnreadDirectMessage(enabled)
                .build();
    }

    public List<CommunityRule> getRules(Long communityId) {
        requireCommunity(communityId);
        return ruleRepository.findByCommunityIdOrderByRuleOrderAsc(communityId);
    }

    public CommunityRule addRule(Long communityId, Long userId, CommunityRule payload) {
        requireModerator(communityId, userId);
        Community community = communityRepository.findById(communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Community not found"));

        payload.setId(null);
        payload.setCommunity(community);
        return ruleRepository.save(payload);
    }

    public CommunityRule updateRule(Long communityId, Long ruleId, Long userId, CommunityRule payload) {
        requireModerator(communityId, userId);

        CommunityRule rule = ruleRepository.findByIdAndCommunityId(ruleId, communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Rule not found"));

        if (payload.getTitle() != null && !payload.getTitle().trim().isEmpty()) {
            rule.setTitle(payload.getTitle().trim());
        }
        if (payload.getDescription() != null) {
            rule.setDescription(payload.getDescription().trim());
        }
        if (payload.getRuleOrder() >= 0) {
            rule.setRuleOrder(payload.getRuleOrder());
        }

        return ruleRepository.save(rule);
    }

    public void deleteRule(Long communityId, Long ruleId, Long userId) {
        requireModerator(communityId, userId);
        CommunityRule rule = ruleRepository.findByIdAndCommunityId(ruleId, communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Rule not found"));
        ruleRepository.delete(rule);
    }

    public List<Flair> getFlairs(Long communityId) {
        requireCommunity(communityId);
        return flairRepository.findByCommunityId(communityId);
    }

    public Flair addFlair(Long communityId, Long userId, Flair payload) {
        requireModerator(communityId, userId);
        Community community = communityRepository.findById(communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Community not found"));

        payload.setId(null);
        payload.setCommunity(community);
        return flairRepository.save(payload);
    }

    public Flair updateFlair(Long communityId, Long flairId, Long userId, Flair payload) {
        requireModerator(communityId, userId);

        Flair flair = flairRepository.findByIdAndCommunityId(flairId, communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Flair not found"));

        if (payload.getName() != null && !payload.getName().trim().isEmpty()) {
            flair.setName(payload.getName().trim());
        }
        if (payload.getColor() != null && !payload.getColor().trim().isEmpty()) {
            flair.setColor(payload.getColor().trim());
        }
        if (payload.getTextColor() != null && !payload.getTextColor().trim().isEmpty()) {
            flair.setTextColor(payload.getTextColor().trim());
        }

        return flairRepository.save(flair);
    }

    public void deleteFlair(Long communityId, Long flairId, Long userId) {
        requireModerator(communityId, userId);
        Flair flair = flairRepository.findByIdAndCommunityId(flairId, communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Flair not found"));

        List<Post> postsWithFlair = postRepository.findByCommunityIdAndFlairId(communityId, flairId);
        if (!postsWithFlair.isEmpty()) {
            for (Post post : postsWithFlair) {
                post.setFlair(null);
            }
            postRepository.saveAll(postsWithFlair);
        }
        flairRepository.delete(flair);
    }

    public void softDeleteCommunity(Long communityId, Long userId) {
        requireModerator(communityId, userId);

        Community community = requireCommunity(communityId);
        community.setType(CommunityType.PRIVATE);
        community
                .setDescription("[archived] " + (community.getDescription() == null ? "" : community.getDescription()));

        List<Post> posts = postRepository.findByCommunityIdAndDeletedAtIsNull(communityId);
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        for (Post post : posts) {
            post.setDeletedAt(now);
        }
        postRepository.saveAll(posts);
        communityRepository.save(community);
    }

    public void hardDeleteCommunity(Long communityId, Long userId) {
        requireAdmin(userId);
        Community community = requireCommunity(communityId);

        List<Post> posts = postRepository.findByCommunityId(communityId);
        for (Post post : posts) {
            voteRepository.deleteByTargetTypeAndTargetId(TargetType.POST, post.getId());
            commentRepository.findByPostId(post.getId())
                    .forEach(comment -> voteRepository.deleteByTargetTypeAndTargetId(TargetType.COMMENT,
                            comment.getId()));
            commentRepository.deleteAllByPostId(post.getId());
        }

        postRepository.deleteAll(posts);
        memberRepository.deleteAll(memberRepository.findByCommunityId(communityId));
        ruleRepository.deleteAll(ruleRepository.findByCommunityIdOrderByRuleOrderAsc(communityId));
        flairRepository.deleteAll(flairRepository.findByCommunityId(communityId));
        communityRepository.delete(community);
    }

    public Long resolveActingUserId(Long requestUserId, Long actingUserId) {
        requireExistingUser(requestUserId);

        if (actingUserId == null || actingUserId.equals(requestUserId)) {
            return requestUserId;
        }

        requireAdmin(requestUserId);
        requireExistingUser(actingUserId);
        return actingUserId;
    }

    public boolean isAdminUser(Long userId) {
        return isAdmin(userId);
    }

    public boolean canModerate(Long communityId, Long userId) {
        if (isAdmin(userId)) {
            return true;
        }

        try {
            MemberRole role = getUserRole(communityId, userId);
            return role != MemberRole.MEMBER;
        } catch (NotMemberException ex) {
            return false;
        }
    }

    public void ensureMembership(Long communityId, Long userId, MemberRole role) {
        Community community = requireCommunity(communityId);
        if (memberRepository.existsByCommunityIdAndUserId(communityId, userId)) {
            return;
        }

        memberRepository.save(CommunityMember.builder()
                .community(community)
                .userId(userId)
                .role(role == null ? MemberRole.MEMBER : role)
                .emailOnUnreadDirectMessage(resolveDirectMessageEmailPreference(userId))
                .build());
        adjustMemberCount(communityId, 1);
    }

    private CommunityResponse toResponse(Community c, Long userId) {
        MemberRole role = null;
        if (userId != null) {
            role = memberRepository.findByCommunityIdAndUserId(c.getId(), userId)
                    .map(CommunityMember::getRole)
                    .orElse(null);
        }

        return CommunityResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .slug(c.getSlug())
                .description(c.getDescription())
                .type(c.getType())
                .memberCount(c.getMemberCount())
                .bannerUrl(c.getBannerUrl())
                .iconUrl(c.getIconUrl())
                .createdAt(c.getCreatedAt())
                .userRole(role)
                .build();
    }

    private CommunityNotificationPreferencesResponse toNotificationPreferencesResponse(CommunityMember member) {
        return CommunityNotificationPreferencesResponse.builder()
                .communityId(member.getCommunity().getId())
                .communitySlug(member.getCommunity().getSlug())
                .emailOnPostReply(member.isEmailOnPostReply())
                .emailOnMention(member.isEmailOnMention())
                .weeklyDigestEnabled(member.isWeeklyDigestEnabled())
                .build();
    }

    private String normalizeOptional(String value) {
        if (value == null)
            return null;
        String trimmed = value.trim();
        if (trimmed.length() > MAX_IMAGE_PAYLOAD_LENGTH) {
            throw new IllegalArgumentException("Image payload is too large. Please upload a smaller image.");
        }
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isAdmin(Long userId) {
        if (userId == null)
            return false;
        return userRepository.findById(userId)
                .map(u -> u.getRole() == Role.ADMIN)
                .orElse(false);
    }

    private void requireCreatorOrAdmin(Long communityId, Long userId) {
        if (isAdmin(userId)) {
            return;
        }

        MemberRole role = getUserRole(communityId, userId);
        if (role != MemberRole.CREATOR) {
            throw new UnauthorizedModeratorException("Creator role required");
        }
    }

    private void requireExistingUser(Long userId) {
        if (userId == null || !userRepository.existsById(userId)) {
            throw new IllegalStateException("User not found");
        }
    }

    private void requireAdmin(Long userId) {
        if (!isAdmin(userId)) {
            throw new UnauthorizedModeratorException("Admin role required");
        }
    }

    private Community requireCommunity(Long communityId) {
        return communityRepository.findById(communityId)
                .orElseThrow(() -> new CommunityNotFoundException("Community not found"));
    }

    private void adjustMemberCount(Long communityId, int delta) {
        if (delta == 0) {
            return;
        }

        Community community = requireCommunity(communityId);
        int next = community.getMemberCount() + delta;
        community.setMemberCount(Math.max(0, next));
        communityRepository.save(community);
    }

    private String fullName(com.elif.entities.user.User user) {
        if (user == null) {
            return "Unknown User";
        }

        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String full = (first + " " + last).trim();
        return full.isEmpty() ? "Unknown User" : full;
    }

    private boolean resolveDirectMessageEmailPreference(Long userId) {
        if (userId == null) {
            return true;
        }

        return memberRepository.findByUserId(userId).stream()
                .findFirst()
                .map(CommunityMember::isEmailOnUnreadDirectMessage)
                .orElse(true);
    }
}
