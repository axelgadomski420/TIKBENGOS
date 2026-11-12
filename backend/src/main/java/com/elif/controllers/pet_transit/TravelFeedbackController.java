package com.elif.controllers.pet_transit;

import com.elif.dto.pet_transit.request.AdminFeedbackResponseRequest;
import com.elif.dto.pet_transit.request.TravelFeedbackCreateRequest;
import com.elif.dto.pet_transit.response.TravelFeedbackResponse;
import com.elif.entities.pet_transit.enums.FeedbackType;
import com.elif.entities.pet_transit.enums.ProcessingStatus;
import com.elif.services.pet_transit.TravelFeedbackService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@AllArgsConstructor
public class TravelFeedbackController {

    private final TravelFeedbackService travelFeedbackService;

    @PostMapping("/travel-plans/{planId}/feedback")
    @ResponseStatus(HttpStatus.CREATED)
    public TravelFeedbackResponse createFeedback(
            @PathVariable Long planId,
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody TravelFeedbackCreateRequest request) {
        return travelFeedbackService.createFeedback(planId, request, userId);
    }

    @GetMapping("/travel-plans/{planId}/feedback")
    public List<TravelFeedbackResponse> getFeedbacksForPlan(
            @PathVariable Long planId,
            @RequestHeader("X-User-Id") Long requesterId) {
        return travelFeedbackService.getFeedbacksForPlan(planId, requesterId);
    }

    @GetMapping("/travel-plans/{planId}/feedback/{feedbackId}")
    public TravelFeedbackResponse getFeedbackById(
            @PathVariable Long planId,
            @PathVariable Long feedbackId,
            @RequestHeader("X-User-Id") Long requesterId) {
        return travelFeedbackService.getFeedbackById(planId, feedbackId, requesterId);
    }

    @PutMapping("/travel-plans/{planId}/feedback/{feedbackId}")
    public TravelFeedbackResponse updateFeedback(
            @PathVariable Long planId,
            @PathVariable Long feedbackId,
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody TravelFeedbackCreateRequest request) {
        return travelFeedbackService.updateFeedback(planId, feedbackId, userId, request);
    }

    @DeleteMapping("/travel-plans/{planId}/feedback/{feedbackId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFeedback(
            @PathVariable Long planId,
            @PathVariable Long feedbackId,
            @RequestHeader("X-User-Id") Long requesterId) {
        travelFeedbackService.deleteFeedback(planId, feedbackId, requesterId);
    }

    @PostMapping("/feedback/{feedbackId}/respond")
    public TravelFeedbackResponse respondToFeedback(
            @PathVariable Long feedbackId,
            @RequestHeader("X-User-Id") Long adminId,
            @Valid @RequestBody AdminFeedbackResponseRequest request) {
        return travelFeedbackService.respondToFeedback(feedbackId, adminId, request);
    }

    @GetMapping("/feedback/my")
    public Page<TravelFeedbackResponse> getMyFeedbacks(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) FeedbackType type,
            @RequestParam(required = false) ProcessingStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        return travelFeedbackService.getMyFeedbacks(userId, type, status, search, startDate, endDate, page, size);
    }

    @GetMapping("/feedback/admin/all")
    public Page<TravelFeedbackResponse> getAllFeedbacks(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) FeedbackType type,
            @RequestParam(required = false) ProcessingStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        return travelFeedbackService.getAllFeedbacks(adminId, type, status, search, startDate, endDate, page, size);
    }

    @GetMapping("/feedback/admin/pending-complaints")
    public List<TravelFeedbackResponse> getPendingComplaints(
            @RequestHeader("X-User-Id") Long adminId) {
        return travelFeedbackService.getPendingComplaints(adminId);
    }

    @GetMapping("/feedback/admin/urgent")
    public List<TravelFeedbackResponse> getUrgentFeedbacks(
            @RequestHeader("X-User-Id") Long adminId) {
        return travelFeedbackService.getUrgentFeedbacks(adminId);
    }
}
