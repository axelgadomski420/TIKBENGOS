package com.elif.controllers.events;

import com.elif.dto.events.request.EligibilityRuleRequest;
import com.elif.entities.events.EventEligibilityRule;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.services.events.implementations.EventEligibilityService;
import com.elif.services.user.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/eligibility-rules")
@RequiredArgsConstructor
@Slf4j
public class EligibilityRuleController {

    private final EventEligibilityService eligibilityService;  // ✅ Service d'implémentation
    private final IUserService userService;

    // ═══════════════════════════════════════════════════════════════════
    // RÈGLES PAR CATÉGORIE
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/categories/{categoryId}")
    public ResponseEntity<List<EventEligibilityRule>> getRulesByCategory(
            @PathVariable Long categoryId) {
        List<EventEligibilityRule> rules = eligibilityService.getRulesByCategory(categoryId);
        return ResponseEntity.ok(rules);
    }

    @PostMapping("/categories/{categoryId}")
    public ResponseEntity<EventEligibilityRule> addRuleToCategory(
            @PathVariable Long categoryId,
            @Valid @RequestBody EligibilityRuleRequest request,
            @RequestParam Long adminId) {

        if (!isAdmin(adminId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        request.setCategoryId(categoryId);
        request.setEventId(null);

        EventEligibilityRule saved = eligibilityService.createRule(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ═══════════════════════════════════════════════════════════════════
    // RÈGLES PAR ÉVÉNEMENT
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/events/{eventId}")
    public ResponseEntity<List<EventEligibilityRule>> getRulesByEvent(
            @PathVariable Long eventId) {
        List<EventEligibilityRule> rules = eligibilityService.getRulesByEvent(eventId);
        return ResponseEntity.ok(rules);
    }

    @PostMapping("/events/{eventId}")
    public ResponseEntity<EventEligibilityRule> addRuleToEvent(
            @PathVariable Long eventId,
            @Valid @RequestBody EligibilityRuleRequest request,
            @RequestParam Long adminId) {

        if (!isAdmin(adminId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        request.setEventId(eventId);
        request.setCategoryId(null);

        EventEligibilityRule saved = eligibilityService.createRule(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
    @GetMapping("/{ruleId}")
    public ResponseEntity<EventEligibilityRule> getRuleById(@PathVariable Long ruleId) {
        return eligibilityService.getRuleById(ruleId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{ruleId}")
    public ResponseEntity<Void> deleteRule(
            @PathVariable Long ruleId,
            @RequestParam Long adminId) {

        if (!isAdmin(adminId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        eligibilityService.deleteRule(ruleId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{ruleId}/deactivate")
    public ResponseEntity<Void> deactivateRule(
            @PathVariable Long ruleId,
            @RequestParam Long adminId) {

        if (!isAdmin(adminId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        eligibilityService.deactivateRule(ruleId);
        return ResponseEntity.noContent().build();
    }
    private boolean isAdmin(Long userId) {
        User user = userService.findUser(userId);
        return user != null && user.getRole() == Role.ADMIN;
    }
}