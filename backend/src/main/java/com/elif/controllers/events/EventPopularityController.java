package com.elif.controllers.events;

import com.elif.dto.events.popularity.request.TrackInteractionRequest;
import com.elif.dto.events.popularity.response.EventAnalyticsSnapshotDTO;
import com.elif.dto.events.popularity.response.EventPopularityDetailDTO;
import com.elif.dto.events.popularity.response.PopularEventDTO;
import com.elif.dto.events.popularity.response.PopularityDashboardDTO;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.services.events.interfaces.IEventAnalyticsService;
import com.elif.services.user.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Period;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Slf4j
public class EventPopularityController {

    private final IEventAnalyticsService analyticsService;
    private final IUserService userService;

    @PostMapping("/{id}/track")
    public ResponseEntity<Void> track(@PathVariable Long id,
                                      @Valid @RequestBody TrackInteractionRequest request,
                                      @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
                                      @RequestHeader(value = "X-Forwarded-For", required = false) String ipAddress) {
        try {
            analyticsService.trackAsync(
                    id,
                    request.type(),
                    request.userId(),
                    sessionId != null ? sessionId : request.sessionId(),
                    ipAddress
            );
        } catch (Exception exception) {
            log.warn("Non-blocking analytics request failed for event {}: {}", id, exception.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/popular")
    public ResponseEntity<List<PopularEventDTO>> getPopularEvents(@RequestParam(defaultValue = "10") int limit,
                                                                  @RequestParam(defaultValue = "30") int days) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        int safeDays = Math.min(Math.max(days, 1), 365);
        return ResponseEntity.ok(analyticsService.getTopPopularEvents(safeLimit, Period.ofDays(safeDays)));
    }

    @GetMapping("/popular/live")
    public ResponseEntity<List<PopularEventDTO>> getLiveRanking(@RequestParam(defaultValue = "10") int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        return ResponseEntity.ok(analyticsService.getLiveRanking(safeLimit));
    }

    @GetMapping("/neglected")
    public ResponseEntity<List<PopularEventDTO>> getNeglectedEvents(@RequestParam Long adminId,
                                                                    @RequestParam(defaultValue = "10") int limit,
                                                                    @RequestParam(defaultValue = "10") long threshold) {
        if (!isAdmin(adminId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        return ResponseEntity.ok(analyticsService.getNeglectedEvents(safeLimit, Math.max(threshold, 0L)));
    }

    @GetMapping("/admin/popularity/dashboard")
    public ResponseEntity<PopularityDashboardDTO> getAdminDashboard(@RequestParam Long adminId) {
        if (!isAdmin(adminId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(analyticsService.getAdminDashboard());
    }

    @GetMapping("/{id}/popularity")
    public ResponseEntity<EventPopularityDetailDTO> getEventPopularity(@PathVariable Long id,
                                                                       @RequestParam Long adminId) {
        if (!isAdmin(adminId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(analyticsService.getEventPopularityDetail(id));
    }

    @GetMapping("/{id}/analytics")
    public ResponseEntity<EventAnalyticsSnapshotDTO> getEventAnalytics(@PathVariable Long id) {
        return ResponseEntity.ok(analyticsService.getEventAnalyticsSnapshot(id));
    }

    private boolean isAdmin(Long userId) {
        if (userId == null) {
            return false;
        }
        User user = userService.findUser(userId);
        return user != null && user.getRole() == Role.ADMIN;
    }
}
