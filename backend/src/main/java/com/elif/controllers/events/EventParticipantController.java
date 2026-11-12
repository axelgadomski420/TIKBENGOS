package com.elif.controllers.events;

import com.elif.dto.events.request.EventParticipantRequest;
import com.elif.dto.events.response.EventParticipantResponse;
import com.elif.dto.events.response.WaitlistResponse;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.services.events.interfaces.IEventParticipantService;
import com.elif.services.events.interfaces.IEventWaitlistService;
import com.elif.services.user.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventParticipantController {

    private final IEventParticipantService participantService;
    private final IEventWaitlistService    waitlistService;
    private final IUserService             userService;

    // ─── INSCRIPTION ──────────────────────────────────────────────────

    @PostMapping("/{id}/join")
    public ResponseEntity<EventParticipantResponse> joinEvent(
            @PathVariable Long id,
            @Valid @RequestBody EventParticipantRequest request,
            @RequestParam Long userId) {

        User user = userService.findUser(userId);
        if (user == null) return ResponseEntity.notFound().build();
        if (user.getRole() != Role.USER) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(participantService.registerToEvent(id, userId, request));
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leaveEvent(
            @PathVariable Long id,
            @RequestParam Long userId) {

        User user = userService.findUser(userId);
        if (user == null || user.getRole() != Role.USER)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        participantService.cancelRegistration(id, userId);
        return ResponseEntity.noContent().build();
    }

    // ─── LECTURE ADMIN ────────────────────────────────────────────────

    @GetMapping("/{id}/participants")
    public ResponseEntity<Page<EventParticipantResponse>> getParticipants(
            @PathVariable Long id,
            @RequestParam Long requesterId,
            @PageableDefault(size = 20) Pageable pageable) {

        if (!isAdmin(requesterId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(participantService.getEventParticipants(id, requesterId, pageable));
    }

    @GetMapping("/{id}/participants/pending")
    public ResponseEntity<Page<EventParticipantResponse>> getPendingParticipants(
            @PathVariable Long id,
            @RequestParam Long adminId,
            @PageableDefault(size = 20) Pageable pageable) {

        if (!isAdmin(adminId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(participantService.getPendingParticipants(id, adminId, pageable));
    }

    @PatchMapping("/participants/{participantId}/approve")
    public ResponseEntity<EventParticipantResponse> approveParticipant(
            @PathVariable Long participantId,
            @RequestParam Long adminId) {

        if (!isAdmin(adminId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(participantService.approveParticipant(participantId, adminId));
    }

    @PatchMapping("/participants/{participantId}/reject")
    public ResponseEntity<EventParticipantResponse> rejectParticipant(
            @PathVariable Long participantId,
            @RequestParam Long adminId) {

        if (!isAdmin(adminId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(participantService.rejectParticipant(participantId, adminId));
    }

    @GetMapping("/registrations/my")
    public ResponseEntity<Page<EventParticipantResponse>> getMyRegistrations(
            @RequestParam Long userId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(participantService.getMyRegistrations(userId, pageable));
    }

    // ─── LISTE D'ATTENTE ──────────────────────────────────────────────

    @PostMapping("/{id}/waitlist")
    public ResponseEntity<WaitlistResponse> joinWaitlist(
            @PathVariable Long id,
            @Valid @RequestBody EventParticipantRequest request,
            @RequestParam Long userId) {

        User user = userService.findUser(userId);
        if (user == null) return ResponseEntity.notFound().build();
        if (user.getRole() != Role.USER) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(waitlistService.joinWaitlist(id, userId, request));
    }

    @DeleteMapping("/{id}/waitlist")
    public ResponseEntity<Void> leaveWaitlist(
            @PathVariable Long id,
            @RequestParam Long userId) {

        User user = userService.findUser(userId);
        if (user == null || user.getRole() != Role.USER)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        waitlistService.leaveWaitlist(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/waitlist/my")
    public ResponseEntity<WaitlistResponse> getMyWaitlistEntry(
            @PathVariable Long id,
            @RequestParam Long userId) {
        return ResponseEntity.ok(waitlistService.getMyWaitlistEntry(id, userId));
    }

    @GetMapping("/{id}/waitlist")
    public ResponseEntity<Page<WaitlistResponse>> getWaitlist(
            @PathVariable Long id,
            @RequestParam Long adminId,
            @PageableDefault(size = 20) Pageable pageable) {

        if (!isAdmin(adminId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(waitlistService.getWaitlist(id, adminId, pageable));
    }

    @GetMapping("/waitlist/my")
    public ResponseEntity<Page<WaitlistResponse>> getMyWaitlistEntries(
            @RequestParam Long userId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(waitlistService.getMyWaitlistEntries(userId, pageable));
    }

    // ✅ ADMIN : notifier manuellement un utilisateur en liste d'attente
    // POST /api/events/{id}/waitlist/{entryId}/notify?adminId=1&deadlineHours=24
    @PostMapping("/{id}/waitlist/{entryId}/notify")
    public ResponseEntity<WaitlistResponse> notifyWaitlistEntry(
            @PathVariable Long id,
            @PathVariable Long entryId,
            @RequestParam Long adminId,
            @RequestParam(defaultValue = "24") int deadlineHours) {

        if (!isAdmin(adminId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(waitlistService.notifyWaitlistEntry(entryId, adminId, deadlineHours));
    }

    // ✅ USER : confirmer sa place après notification
    // POST /api/events/{id}/waitlist/confirm?userId=1
    @PostMapping("/{id}/waitlist/confirm")
    public ResponseEntity<WaitlistResponse> confirmWaitlistEntry(
            @PathVariable Long id,
            @RequestParam Long userId) {

        User user = userService.findUser(userId);
        if (user == null) return ResponseEntity.notFound().build();
        if (user.getRole() != Role.USER) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        return ResponseEntity.ok(waitlistService.confirmWaitlistEntry(id, userId));
    }

    // ✅ ADMIN : promotion manuelle du premier en attente
    // POST /api/events/{id}/waitlist/promote?adminId=1
    @PostMapping("/{id}/waitlist/promote")
    public ResponseEntity<Boolean> promoteNext(
            @PathVariable Long id,
            @RequestParam Long adminId) {

        if (!isAdmin(adminId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        boolean promoted = waitlistService.promoteNext(id);
        return ResponseEntity.ok(promoted);
    }

    // ─── HELPER ───────────────────────────────────────────────────────

    private boolean isAdmin(Long userId) {
        User user = userService.findUser(userId);
        return user != null && user.getRole() == Role.ADMIN;
    }
}