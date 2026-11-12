package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.request.AdminFeedbackResponseRequest;
import com.elif.dto.pet_transit.request.TravelFeedbackCreateRequest;
import com.elif.dto.pet_transit.response.TravelFeedbackResponse;
import com.elif.entities.notification.enums.NotificationType;
import com.elif.entities.pet_transit.TravelFeedback;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.FeedbackType;
import com.elif.entities.pet_transit.enums.ProcessingStatus;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.entities.pet_transit.enums.UrgencyLevel;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.exceptions.pet_transit.FeedbackNotAllowedException;
import com.elif.exceptions.pet_transit.TravelFeedbackNotFoundException;
import com.elif.exceptions.pet_transit.TravelPlanNotFoundException;
import com.elif.exceptions.pet_transit.UnauthorizedTravelAccessException;
import com.elif.repositories.pet_transit.TravelFeedbackRepository;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import com.elif.repositories.pet_transit.specifications.TravelFeedbackSpecifications;
import com.elif.repositories.user.UserRepository;
import com.elif.services.notification.AppNotificationService;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
@Transactional
public class TravelFeedbackService {

    private final TravelFeedbackRepository travelFeedbackRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final UserRepository userRepository;
    private final AppNotificationService appNotificationService;

    public TravelFeedbackResponse createFeedback(Long planId, TravelFeedbackCreateRequest req, Long ownerId) {
        TravelPlan travelPlan = verifyPlanOwnership(planId, ownerId);

        if (travelPlan.getStatus() != TravelPlanStatus.COMPLETED) {
            throw new FeedbackNotAllowedException("Feedback allowed only for completed plans");
        }

        if (req.getFeedbackType() == null) {
            throw new IllegalArgumentException("Feedback type is required");
        }

        validateFeedbackContentForType(req.getFeedbackType(), req.getRating(), req.getMessage());

        TravelFeedback feedback = TravelFeedback.builder()
                .travelPlan(travelPlan)
                .feedbackType(req.getFeedbackType())
                .rating(req.getRating())
                .title(req.getTitle())
                .message(req.getMessage())
                .incidentLocation(req.getIncidentLocation())
                .urgencyLevel(req.getUrgencyLevel() != null ? req.getUrgencyLevel() : UrgencyLevel.NORMAL)
                .processingStatus(ProcessingStatus.PENDING)
                .build();

        TravelFeedback saved = travelFeedbackRepository.save(feedback);
        return toResponse(saved);
    }

    public TravelFeedbackResponse updateFeedback(Long planId, Long feedbackId, Long ownerId,
                                                 TravelFeedbackCreateRequest req) {
        verifyPlanOwnership(planId, ownerId);
        TravelFeedback feedback = getFeedbackAndVerifyPlan(feedbackId, planId);

        FeedbackType effectiveType = req.getFeedbackType() != null
                ? req.getFeedbackType()
                : feedback.getFeedbackType();

        Integer effectiveRating = req.getRating() != null
                ? req.getRating()
                : feedback.getRating();

        String effectiveMessage = req.getMessage() != null
                ? req.getMessage()
                : feedback.getMessage();

        validateFeedbackContentForType(effectiveType, effectiveRating, effectiveMessage);

        if (req.getFeedbackType() != null) {
            feedback.setFeedbackType(req.getFeedbackType());
        }
        if (req.getTitle() != null) {
            feedback.setTitle(req.getTitle());
        }
        if (req.getMessage() != null) {
            feedback.setMessage(req.getMessage());
        }
        if (req.getRating() != null) {
            feedback.setRating(req.getRating());
        }
        if (req.getIncidentLocation() != null) {
            feedback.setIncidentLocation(req.getIncidentLocation());
        }
        if (req.getUrgencyLevel() != null) {
            feedback.setUrgencyLevel(req.getUrgencyLevel());
        }

        TravelFeedback updated = travelFeedbackRepository.save(feedback);
        return toResponse(updated);
    }

    public Page<TravelFeedbackResponse> getMyFeedbacks(Long ownerId) {
        return getMyFeedbacks(ownerId, null, null, null, null, null, 0, 1000);
    }

    public Page<TravelFeedbackResponse> getMyFeedbacks(
            Long ownerId,
            FeedbackType type,
            ProcessingStatus status,
            String search,
            LocalDate startDate,
            LocalDate endDate,
            int page,
            int size
    ) {
        LocalDate normalizedStartDate = normalizeStartDate(startDate, endDate);
        LocalDate normalizedEndDate = normalizeEndDate(startDate, endDate);

        Specification<TravelFeedback> specification = TravelFeedbackSpecifications.byFilters(
                ownerId,
                type,
                status,
                search,
                normalizedStartDate,
                normalizedEndDate
        );

        Pageable pageable = PageRequest.of(
            Math.max(page, 0),
            Math.max(size, 1),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return travelFeedbackRepository.findAll(specification, pageable)
            .map(this::toResponse);
    }

    public List<TravelFeedbackResponse> getFeedbacksForPlan(Long planId, Long requesterId) {
        verifyPlanAccessOrAdmin(planId, requesterId);

        return travelFeedbackRepository.findByTravelPlanIdOrderByCreatedAtDesc(planId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public TravelFeedbackResponse getFeedbackById(Long planId, Long feedbackId, Long requesterId) {
        verifyPlanAccessOrAdmin(planId, requesterId);
        TravelFeedback feedback = getFeedbackAndVerifyPlan(feedbackId, planId);
        return toResponse(feedback);
    }

    public TravelFeedbackResponse respondToFeedback(Long feedbackId, Long adminId,
                                                    AdminFeedbackResponseRequest req) {
        TravelFeedback feedback = travelFeedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new TravelFeedbackNotFoundException("Feedback not found: " + feedbackId));

        User admin = getAdminUser(adminId);

        ensureMessageForLegacyFeedback(feedback);

        feedback.setProcessingStatus(req.getProcessingStatus());
        feedback.setAdminResponse(req.getAdminResponse());
        feedback.setRespondedByAdmin(admin);
        feedback.setRespondedAt(LocalDateTime.now());

        TravelFeedback updated = travelFeedbackRepository.save(feedback);

        String feedbackTypeLabel = updated.getFeedbackType().toString().toLowerCase(Locale.ROOT);
        appNotificationService.create(
            updated.getTravelPlan().getOwner().getId(),
            adminId,
            NotificationType.TRAVEL_FEEDBACK_RESPONDED,
            "Feedback response available",
            "The admin has responded to your "
                + feedbackTypeLabel
                + " about your trip to "
                + updated.getTravelPlan().getDestination().getTitle()
                + ". Tap to read.",
            "/app/transit/feedback/my",
            "TRAVEL_FEEDBACK",
            updated.getId());

        return toResponse(updated);
    }

    public void deleteFeedback(Long planId, Long feedbackId, Long requesterId) {
        verifyPlanAccessOrAdmin(planId, requesterId);
        TravelFeedback feedback = getFeedbackAndVerifyPlan(feedbackId, planId);

        if (isAdmin(requesterId)) {
            travelFeedbackRepository.delete(feedback);
            return;
        }

        if (feedback.getAdminResponse() != null) {
            throw new FeedbackNotAllowedException(
                    "Cannot delete feedback that has received an admin response."
            );
        }

        if (feedback.getProcessingStatus() == ProcessingStatus.RESOLVED
                || feedback.getProcessingStatus() == ProcessingStatus.CLOSED) {
            throw new FeedbackNotAllowedException(
                    "Cannot delete resolved or closed feedback."
            );
        }

        travelFeedbackRepository.delete(feedback);
    }

    public Page<TravelFeedbackResponse> getAllFeedbacks(Long adminId) {
        return getAllFeedbacks(adminId, null, null, null, null, null, 0, 1000);
    }

    public Page<TravelFeedbackResponse> getAllFeedbacks(
            Long adminId,
            FeedbackType type,
            ProcessingStatus status,
            String search,
            LocalDate startDate,
            LocalDate endDate,
            int page,
            int size
    ) {
        getAdminUser(adminId);

        LocalDate normalizedStartDate = normalizeStartDate(startDate, endDate);
        LocalDate normalizedEndDate = normalizeEndDate(startDate, endDate);

        Specification<TravelFeedback> specification = TravelFeedbackSpecifications.byFilters(
                null,
                type,
                status,
                search,
                normalizedStartDate,
                normalizedEndDate
        );

        Pageable pageable = PageRequest.of(
            Math.max(page, 0),
            Math.max(size, 1),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return travelFeedbackRepository.findAll(specification, pageable)
            .map(this::toResponse);
    }

    public List<TravelFeedbackResponse> getPendingComplaints(Long adminId) {
        getAdminUser(adminId);

        return travelFeedbackRepository.findByFeedbackTypeAndProcessingStatus(
                        FeedbackType.COMPLAINT,
                        ProcessingStatus.PENDING
                )
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<TravelFeedbackResponse> getUrgentFeedbacks(Long adminId) {
        getAdminUser(adminId);

        return travelFeedbackRepository.findByUrgencyLevelInAndProcessingStatus(
                        List.of(UrgencyLevel.HIGH, UrgencyLevel.CRITICAL),
                        ProcessingStatus.PENDING
                )
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private TravelPlan verifyPlanOwnership(Long planId, Long ownerId) {
        TravelPlan travelPlan = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found: " + planId));

        if (!travelPlan.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedTravelAccessException("Not plan owner");
        }

        return travelPlan;
    }

    private TravelPlan verifyPlanAccessOrAdmin(Long planId, Long requesterId) {
        TravelPlan travelPlan = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found: " + planId));

        boolean isOwner = travelPlan.getOwner().getId().equals(requesterId);
        boolean isAdmin = isAdmin(requesterId);

        if (!isOwner && !isAdmin) {
            throw new UnauthorizedTravelAccessException("User is not allowed to access feedbacks for this plan");
        }

        return travelPlan;
    }

    private TravelFeedback getFeedbackAndVerifyPlan(Long feedbackId, Long planId) {
        TravelFeedback feedback = travelFeedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new TravelFeedbackNotFoundException("Feedback not found: " + feedbackId));

        if (!feedback.getTravelPlan().getId().equals(planId)) {
            throw new UnauthorizedTravelAccessException("Feedback does not belong to this plan");
        }

        return feedback;
    }

    private User getAdminUser(Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedTravelAccessException("Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedTravelAccessException("User " + adminId + " is not an admin");
        }

        return admin;
    }

    private boolean isAdmin(Long userId) {
        return userRepository.findById(userId)
                .map(user -> user.getRole() == Role.ADMIN)
                .orElse(false);
    }

    private void ensureMessageForLegacyFeedback(TravelFeedback feedback) {
        if (feedback == null || feedback.getFeedbackType() == null) {
            return;
        }

        FeedbackType type = feedback.getFeedbackType();
        if (type != FeedbackType.INCIDENT
                && type != FeedbackType.COMPLAINT
                && type != FeedbackType.SUGGESTION) {
            return;
        }

        if (feedback.getMessage() != null && !feedback.getMessage().trim().isEmpty()) {
            return;
        }

        String fallbackMessage = feedback.getTitle() != null && !feedback.getTitle().trim().isEmpty()
                ? feedback.getTitle().trim()
                : "Legacy feedback: message unavailable.";

        feedback.setMessage(fallbackMessage);
    }

    private void validateFeedbackContentForType(FeedbackType type, Integer rating, String message) {
        if (type == FeedbackType.REVIEW && rating == null) {
            throw new IllegalArgumentException("Rating required for REVIEW type");
        }

        if ((type == FeedbackType.INCIDENT
                || type == FeedbackType.COMPLAINT
                || type == FeedbackType.SUGGESTION)
                && (message == null || message.trim().isEmpty())) {
            throw new IllegalArgumentException(
                    "Message required for INCIDENT, COMPLAINT and SUGGESTION");
        }
    }

    private TravelFeedbackResponse toResponse(TravelFeedback feedback) {
        String destinationTitle = feedback.getTravelPlan().getDestination() != null
                ? feedback.getTravelPlan().getDestination().getTitle()
                : null;

        String respondedByAdminName = null;
        if (feedback.getRespondedByAdmin() != null) {
            respondedByAdminName = feedback.getRespondedByAdmin().getFirstName()
                    + " "
                    + feedback.getRespondedByAdmin().getLastName();
        }

        return TravelFeedbackResponse.builder()
                .id(feedback.getId())
                .travelPlanId(feedback.getTravelPlan().getId())
                .destinationTitle(destinationTitle)
                .feedbackType(feedback.getFeedbackType())
                .rating(feedback.getRating())
                .title(feedback.getTitle())
                .message(feedback.getMessage())
                .incidentLocation(feedback.getIncidentLocation())
                .aiSentimentScore(feedback.getAiSentimentScore())
                .urgencyLevel(feedback.getUrgencyLevel())
                .processingStatus(feedback.getProcessingStatus())
                .adminResponse(feedback.getAdminResponse())
                .respondedByAdminName(respondedByAdminName)
                .respondedAt(feedback.getRespondedAt())
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }

    private LocalDate normalizeStartDate(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            return endDate;
        }
        return startDate;
    }

    private LocalDate normalizeEndDate(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            return startDate;
        }
        return endDate;
    }
}


