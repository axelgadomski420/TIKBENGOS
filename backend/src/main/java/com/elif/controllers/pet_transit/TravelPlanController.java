package com.elif.controllers.pet_transit;

import com.elif.dto.pet_transit.request.TravelPlanCreateRequest;
import com.elif.dto.pet_transit.request.TravelPlanUpdateRequest;
import com.elif.dto.pet_transit.response.TravelPlanResponse;
import com.elif.dto.pet_transit.response.TravelPlanSummaryResponse;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.services.pet_transit.TravelPlanService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/travel-plans")
@AllArgsConstructor
public class TravelPlanController {

    private final TravelPlanService travelPlanService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TravelPlanResponse createTravelPlan(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody TravelPlanCreateRequest request) {
        return travelPlanService.createTravelPlan(userId, request);
    }

    @GetMapping("/my")
    public Page<TravelPlanSummaryResponse> getMyPlans(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) TravelPlanStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        return travelPlanService.getMyPlans(userId, status, search, startDate, endDate, page, size);
    }

    @GetMapping("/{id}")
    public TravelPlanResponse getPlanById(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return travelPlanService.getPlanById(id, userId);
    }

    @GetMapping("/admin")
    public Page<TravelPlanResponse> getAllPlansForAdmin(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) TravelPlanStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        return travelPlanService.getAllPlansForAdmin(adminId, status, search, startDate, endDate, page, size);
    }

    @GetMapping("/admin/all")
    public Page<TravelPlanResponse> getAllPlansForAdminAlias(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) TravelPlanStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        return travelPlanService.getAllPlansForAdmin(adminId, status, search, startDate, endDate, page, size);
    }

    @GetMapping("/admin/{id}")
    public TravelPlanResponse getPlanByIdForAdmin(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId) {
        return travelPlanService.getPlanByIdForAdmin(id, adminId);
    }

    @DeleteMapping("/admin/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removePlanFromAdminView(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId) {
        travelPlanService.removePlanFromAdminView(id, adminId);
    }

    @PutMapping("/{id}")
    public TravelPlanResponse updateTravelPlan(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody TravelPlanUpdateRequest request) {
        return travelPlanService.updateTravelPlan(id, userId, request);
    }

    @PostMapping("/{id}/submit")
    public TravelPlanResponse submitPlan(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return travelPlanService.submitPlan(id, userId);
    }

    @PostMapping("/{id}/complete")
    public TravelPlanResponse completePlan(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return travelPlanService.completePlan(id, userId);
    }

    @PostMapping("/{id}/cancel")
    public TravelPlanResponse cancelPlan(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return travelPlanService.cancelPlan(id, userId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlan(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        travelPlanService.deletePlan(id, requesterId);
    }

    @GetMapping("/admin/submitted")
    public List<TravelPlanResponse> getSubmittedPlans(
            @RequestHeader("X-User-Id") Long adminId) {
        return travelPlanService.getSubmittedPlans(adminId);
    }

    @PostMapping("/{id}/approve")
    public TravelPlanResponse approvePlan(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String comment) {
        return travelPlanService.approvePlan(id, adminId, comment);
    }

    @PostMapping("/{id}/reject")
    public TravelPlanResponse rejectPlan(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String comment) {
        return travelPlanService.rejectPlan(id, adminId, comment);
    }
}
