package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.request.SafetyChecklistCreateRequest;
import com.elif.dto.pet_transit.response.ChecklistStatsResponse;
import com.elif.dto.pet_transit.response.SafetyChecklistResponse;
import com.elif.entities.pet_transit.SafetyChecklist;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.exceptions.pet_transit.ChecklistItemNotFoundException;
import com.elif.exceptions.pet_transit.TravelPlanNotFoundException;
import com.elif.exceptions.pet_transit.UnauthorizedTravelAccessException;
import com.elif.repositories.pet_transit.SafetyChecklistRepository;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import com.elif.repositories.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
@Transactional
public class SafetyChecklistService {

    private final SafetyChecklistRepository safetyChecklistRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final ReadinessScoreService readinessScoreService;
    private final UserRepository userRepository;

    public SafetyChecklistResponse addChecklistItem(Long planId, SafetyChecklistCreateRequest req, Long ownerId) {
        validateRequestPlanId(planId, req.getTravelPlanId());
        TravelPlan travelPlan = verifyPlanOwnership(planId, ownerId);

        SafetyChecklist item = SafetyChecklist.builder()
                .travelPlan(travelPlan)
                .title(req.getTitle())
                .taskCode(req.getTaskCode())
                .category(req.getCategory())
                .priorityLevel(req.getPriorityLevel())
                .mandatory(req.getMandatory() != null ? req.getMandatory() : false)
                .dueDate(req.getDueDate())
                .completed(false)
                .build();

        SafetyChecklist saved = safetyChecklistRepository.save(item);
        readinessScoreService.recalculateAndSave(planId);
        return toResponse(saved);
    }

    public SafetyChecklistResponse updateChecklistItem(Long planId, Long itemId, Long ownerId,
                                                       SafetyChecklistCreateRequest req) {
        validateRequestPlanId(planId, req.getTravelPlanId());
        verifyPlanOwnership(planId, ownerId);
        SafetyChecklist item = getChecklistItemAndVerifyPlan(itemId, planId);

        if (req.getTitle() != null) {
            item.setTitle(req.getTitle());
        }
        if (req.getTaskCode() != null) {
            item.setTaskCode(req.getTaskCode());
        }
        if (req.getCategory() != null) {
            item.setCategory(req.getCategory());
        }
        if (req.getPriorityLevel() != null) {
            item.setPriorityLevel(req.getPriorityLevel());
        }
        if (req.getMandatory() != null) {
            item.setMandatory(req.getMandatory());
        }
        if (req.getDueDate() != null) {
            item.setDueDate(req.getDueDate());
        }

        SafetyChecklist updated = safetyChecklistRepository.save(item);
        readinessScoreService.recalculateAndSave(planId);
        return toResponse(updated);
    }

    public SafetyChecklistResponse markCompleted(Long planId, Long itemId, Long ownerId) {
        verifyPlanOwnership(planId, ownerId);
        SafetyChecklist item = getChecklistItemAndVerifyPlan(itemId, planId);

        item.setCompleted(true);
        item.setCompletedAt(LocalDateTime.now());

        SafetyChecklist updated = safetyChecklistRepository.save(item);
        readinessScoreService.recalculateAndSave(planId);

        return toResponse(updated);
    }

    public SafetyChecklistResponse markUncompleted(Long planId, Long itemId, Long ownerId) {
        verifyPlanOwnership(planId, ownerId);
        SafetyChecklist item = getChecklistItemAndVerifyPlan(itemId, planId);

        item.setCompleted(false);
        item.setCompletedAt(null);

        SafetyChecklist updated = safetyChecklistRepository.save(item);
        readinessScoreService.recalculateAndSave(planId);

        return toResponse(updated);
    }

    public List<SafetyChecklistResponse> getChecklistForPlan(Long planId, Long ownerId) {
        verifyPlanOwnership(planId, ownerId);

        return safetyChecklistRepository.findByTravelPlanId(planId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public SafetyChecklistResponse getChecklistItemById(Long planId, Long itemId, Long ownerId) {
        verifyPlanOwnership(planId, ownerId);
        SafetyChecklist item = getChecklistItemAndVerifyPlan(itemId, planId);
        return toResponse(item);
    }

    public void deleteChecklistItem(Long planId, Long itemId, Long ownerId) {
        verifyPlanOwnership(planId, ownerId);
        SafetyChecklist item = getChecklistItemAndVerifyPlan(itemId, planId);

        safetyChecklistRepository.delete(item);
        readinessScoreService.recalculateAndSave(planId);
    }

    public ChecklistStatsResponse calculateCompletionStats(Long planId, Long requesterId) {
        verifyPlanStatsAccess(planId, requesterId);
        List<SafetyChecklist> allItems = safetyChecklistRepository.findByTravelPlanId(planId);

        int totalItems = allItems.size();
        int completedItems = (int) allItems.stream()
                .filter(SafetyChecklist::isCompleted)
                .count();
        int totalMandatory = (int) allItems.stream()
                .filter(SafetyChecklist::isMandatory)
                .count();
        int completedMandatory = (int) allItems.stream()
                .filter(item -> item.isMandatory() && item.isCompleted())
                .count();

        double completionPercentage = totalItems > 0
                ? (completedItems / (double) totalItems) * 100
                : 0.0;

        double mandatoryCompletionPercentage = totalMandatory > 0
                ? (completedMandatory / (double) totalMandatory) * 100
                : 0.0;

        return ChecklistStatsResponse.builder()
                .totalItems(totalItems)
                .completedItems(completedItems)
                .totalMandatory(totalMandatory)
                .completedMandatory(completedMandatory)
                .completionPercentage(completionPercentage)
                .mandatoryCompletionPercentage(mandatoryCompletionPercentage)
                .build();
    }

    private TravelPlan verifyPlanOwnership(Long planId, Long ownerId) {
        TravelPlan travelPlan = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found: " + planId));

        if (!travelPlan.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedTravelAccessException("Not plan owner");
        }

        return travelPlan;
    }

    private TravelPlan verifyPlanStatsAccess(Long planId, Long requesterId) {
        TravelPlan travelPlan = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found: " + planId));

        boolean isOwner = travelPlan.getOwner().getId().equals(requesterId);

        User user = userRepository.findById(requesterId)
                .orElseThrow(() -> new UnauthorizedTravelAccessException("User not found"));

        boolean isAdmin = user.getRole() == Role.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new UnauthorizedTravelAccessException("User is not allowed to view checklist stats for this plan");
        }

        return travelPlan;
    }

    private SafetyChecklist getChecklistItemAndVerifyPlan(Long itemId, Long planId) {
        SafetyChecklist item = safetyChecklistRepository.findById(itemId)
                .orElseThrow(() -> new ChecklistItemNotFoundException("Checklist item not found: " + itemId));

        if (!item.getTravelPlan().getId().equals(planId)) {
            throw new UnauthorizedTravelAccessException("Item does not belong to this plan");
        }

        return item;
    }

    private void validateRequestPlanId(Long pathPlanId, Long bodyPlanId) {
        if (bodyPlanId != null && !bodyPlanId.equals(pathPlanId)) {
            throw new IllegalArgumentException("travelPlanId in request body must match planId in URL");
        }
    }

    private SafetyChecklistResponse toResponse(SafetyChecklist item) {
        return SafetyChecklistResponse.builder()
                .id(item.getId())
                .travelPlanId(item.getTravelPlan().getId())
                .title(item.getTitle())
                .taskCode(item.getTaskCode())
                .category(item.getCategory())
                .priorityLevel(item.getPriorityLevel())
                .mandatory(item.isMandatory())
                .completed(item.isCompleted())
                .dueDate(item.getDueDate())
                .completedAt(item.getCompletedAt())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}