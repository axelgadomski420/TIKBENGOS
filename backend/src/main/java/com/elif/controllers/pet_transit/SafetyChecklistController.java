package com.elif.controllers.pet_transit;

import com.elif.dto.pet_transit.request.SafetyChecklistCreateRequest;
import com.elif.dto.pet_transit.response.ChecklistStatsResponse;
import com.elif.dto.pet_transit.response.SafetyChecklistResponse;
import com.elif.services.pet_transit.SafetyChecklistService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/travel-plans/{planId}/checklist")
@AllArgsConstructor
public class SafetyChecklistController {

    private final SafetyChecklistService safetyChecklistService;

    @GetMapping
    public List<SafetyChecklistResponse> getChecklistForPlan(
            @PathVariable Long planId,
            @RequestHeader("X-User-Id") Long userId) {
        return safetyChecklistService.getChecklistForPlan(planId, userId);
    }

    @GetMapping("/{itemId}")
    public SafetyChecklistResponse getChecklistItemById(
            @PathVariable Long planId,
            @PathVariable Long itemId,
            @RequestHeader("X-User-Id") Long userId) {
        return safetyChecklistService.getChecklistItemById(planId, itemId, userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SafetyChecklistResponse addChecklistItem(
            @PathVariable Long planId,
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody SafetyChecklistCreateRequest request) {
        return safetyChecklistService.addChecklistItem(planId, request, userId);
    }

    @PutMapping("/{itemId}")
    public SafetyChecklistResponse updateChecklistItem(
            @PathVariable Long planId,
            @PathVariable Long itemId,
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody SafetyChecklistCreateRequest request) {
        return safetyChecklistService.updateChecklistItem(planId, itemId, userId, request);
    }

    @PatchMapping("/{itemId}/complete")
    public SafetyChecklistResponse markCompleted(
            @PathVariable Long planId,
            @PathVariable Long itemId,
            @RequestHeader("X-User-Id") Long userId) {
        return safetyChecklistService.markCompleted(planId, itemId, userId);
    }

    @PatchMapping("/{itemId}/uncomplete")
    public SafetyChecklistResponse markUncompleted(
            @PathVariable Long planId,
            @PathVariable Long itemId,
            @RequestHeader("X-User-Id") Long userId) {
        return safetyChecklistService.markUncompleted(planId, itemId, userId);
    }

    @DeleteMapping("/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChecklistItem(
            @PathVariable Long planId,
            @PathVariable Long itemId,
            @RequestHeader("X-User-Id") Long userId) {
        safetyChecklistService.deleteChecklistItem(planId, itemId, userId);
    }

    @GetMapping("/stats")
    public ChecklistStatsResponse calculateCompletionStats(
            @PathVariable Long planId,
            @RequestHeader("X-User-Id") Long userId) {
        return safetyChecklistService.calculateCompletionStats(planId, userId);
    }
}