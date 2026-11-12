package com.elif.controllers.community;

import com.elif.dto.community.request.CreateCommunityRequest;
import com.elif.dto.community.request.CommunityNotificationPreferencesRequest;
import com.elif.dto.community.response.CommunityMemberResponse;
import com.elif.dto.community.response.CommunityNotificationPreferencesResponse;
import com.elif.dto.community.response.CommunityResponse;
import com.elif.dto.community.response.FlairResponse;
import com.elif.entities.community.CommunityRule;
import com.elif.entities.community.Flair;
import com.elif.services.community.CommunityService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community")
@AllArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping("/communities")
    public List<CommunityResponse> getCommunities(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return communityService.findPublicCommunities(userId);
    }

    @GetMapping("/communities/{slug}")
    public CommunityResponse getCommunity(@PathVariable("slug") String slug,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return communityService.getBySlug(slug, userId);
    }

    @PostMapping("/communities")
    @ResponseStatus(HttpStatus.CREATED)
    public CommunityResponse createCommunity(@RequestBody CreateCommunityRequest request,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader(value = "X-Act-As-User-Id", required = false) Long actingUserId) {
        return communityService.createCommunity(request, userId, actingUserId);
    }

    @PutMapping("/communities/{id}")
    public CommunityResponse updateCommunity(@PathVariable("id") Long id,
            @RequestBody CreateCommunityRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        return communityService.updateCommunity(id, request, userId);
    }

    @DeleteMapping("/communities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCommunity(@PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(value = "hard", defaultValue = "false") boolean hardDelete) {
        if (hardDelete) {
            communityService.hardDeleteCommunity(id, userId);
            return;
        }

        communityService.softDeleteCommunity(id, userId);
    }

    @GetMapping("/communities/{id}/members")
    public List<CommunityMemberResponse> getMembers(@PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return communityService.getMembers(id, userId);
    }

    @DeleteMapping("/communities/{id}/members/{targetUserId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable("id") Long id,
            @PathVariable("targetUserId") Long targetUserId,
            @RequestHeader("X-User-Id") Long userId) {
        communityService.removeMember(id, targetUserId, userId);
    }

    @PatchMapping("/communities/{id}/members/{targetUserId}/promote")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void promoteMemberToModerator(@PathVariable("id") Long id,
            @PathVariable("targetUserId") Long targetUserId,
            @RequestHeader("X-User-Id") Long userId) {
        communityService.promoteToModerator(id, targetUserId, userId);
    }

    @PatchMapping("/communities/{id}/members/{targetUserId}/demote")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void demoteModeratorToMember(@PathVariable("id") Long id,
            @PathVariable("targetUserId") Long targetUserId,
            @RequestHeader("X-User-Id") Long userId) {
        communityService.demoteModerator(id, targetUserId, userId);
    }

    @PostMapping("/communities/{id}/join")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void joinCommunity(@PathVariable("id") Long id, @RequestHeader("X-User-Id") Long userId) {
        communityService.joinCommunity(id, userId);
    }

    @GetMapping("/communities/{id}/notification-preferences")
    public CommunityNotificationPreferencesResponse getNotificationPreferences(@PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return communityService.getNotificationPreferences(id, userId);
    }

    @PutMapping("/communities/{id}/notification-preferences")
    public CommunityNotificationPreferencesResponse updateNotificationPreferences(@PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody CommunityNotificationPreferencesRequest request) {
        return communityService.updateNotificationPreferences(id, userId, request);
    }

    @PostMapping("/communities/{id}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveCommunity(@PathVariable("id") Long id, @RequestHeader("X-User-Id") Long userId) {
        communityService.leaveCommunity(id, userId);
    }

    @GetMapping("/communities/{id}/rules")
    public List<CommunityRule> getRules(@PathVariable("id") Long id) {
        return communityService.getRules(id);
    }

    @PostMapping("/communities/{id}/rules")
    public CommunityRule addRule(@PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody CommunityRule payload) {
        return communityService.addRule(id, userId, payload);
    }

    @PutMapping("/communities/{id}/rules/{ruleId}")
    public CommunityRule updateRule(@PathVariable("id") Long id,
            @PathVariable("ruleId") Long ruleId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody CommunityRule payload) {
        return communityService.updateRule(id, ruleId, userId, payload);
    }

    @DeleteMapping("/communities/{id}/rules/{ruleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRule(@PathVariable("id") Long id,
            @PathVariable("ruleId") Long ruleId,
            @RequestHeader("X-User-Id") Long userId) {
        communityService.deleteRule(id, ruleId, userId);
    }

    @GetMapping("/communities/{id}/flairs")
    public List<FlairResponse> getFlairs(@PathVariable("id") Long id) {
        return communityService.getFlairs(id).stream().map(this::toFlairResponse).toList();
    }

    @PostMapping("/communities/{id}/flairs")
    public FlairResponse addFlair(@PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Flair payload) {
        return toFlairResponse(communityService.addFlair(id, userId, payload));
    }

    @PutMapping("/communities/{id}/flairs/{flairId}")
    public FlairResponse updateFlair(@PathVariable("id") Long id,
            @PathVariable("flairId") Long flairId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Flair payload) {
        return toFlairResponse(communityService.updateFlair(id, flairId, userId, payload));
    }

    @DeleteMapping("/communities/{id}/flairs/{flairId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFlair(@PathVariable("id") Long id,
            @PathVariable("flairId") Long flairId,
            @RequestHeader("X-User-Id") Long userId) {
        communityService.deleteFlair(id, flairId, userId);
    }

    private FlairResponse toFlairResponse(Flair flair) {
        return FlairResponse.builder()
                .id(flair.getId())
                .name(flair.getName())
                .color(flair.getColor())
                .textColor(flair.getTextColor())
                .build();
    }
}
