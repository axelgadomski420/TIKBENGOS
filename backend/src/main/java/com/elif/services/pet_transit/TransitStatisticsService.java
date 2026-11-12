package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.response.TransitDashboardDTO;
import com.elif.entities.pet_transit.enums.DestinationStatus;
import com.elif.entities.pet_transit.enums.FeedbackType;
import com.elif.entities.pet_transit.enums.ProcessingStatus;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.exceptions.pet_transit.UnauthorizedTravelAccessException;
import com.elif.repositories.pet_transit.TravelDestinationRepository;
import com.elif.repositories.pet_transit.TravelFeedbackRepository;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import com.elif.repositories.user.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Statistics engine for the Transit admin dashboard.
 * Computes real data from JPA repositories — no raw SQL needed.
 */
@Service
@AllArgsConstructor
@Transactional(readOnly = true)
public class TransitStatisticsService {

    private final TravelDestinationRepository destinationRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelFeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    /**
     * Builds the full dashboard stats snapshot.
     * All counts are derived from repository queries against live data.
     */
    public TransitDashboardDTO getStatistics(Long adminId) {

        validateAdmin(adminId);

        // ── Destinations ──────────────────────────────────────────────────────
        long totalDestinations   = destinationRepository.count();
        long publishedDest       = destinationRepository.countByStatus(DestinationStatus.PUBLISHED);
        long scheduledDest       = destinationRepository.countByStatus(DestinationStatus.SCHEDULED);
        long draftDest           = destinationRepository.countByStatus(DestinationStatus.DRAFT);
        long archivedDest        = destinationRepository.countByStatus(DestinationStatus.ARCHIVED);

        // ── Travel Plans ──────────────────────────────────────────────────────
        long totalPlans      = travelPlanRepository.count();
        long submittedPlans  = travelPlanRepository.countByStatus(TravelPlanStatus.SUBMITTED);
        long prepPlans       = travelPlanRepository.countByStatus(TravelPlanStatus.IN_PREPARATION);
        long approvedPlans   = travelPlanRepository.countByStatus(TravelPlanStatus.APPROVED);
        long rejectedPlans   = travelPlanRepository.countByStatus(TravelPlanStatus.REJECTED);
        long completedPlans  = travelPlanRepository.countByStatus(TravelPlanStatus.COMPLETED);

        // ── Feedback ──────────────────────────────────────────────────────────
        long totalFeedback    = feedbackRepository.count();

        // Per-type counts — one query each, covers all ProcessingStatus values
        long reviewCount      = feedbackRepository.countByFeedbackType(FeedbackType.REVIEW);
        long suggestionCount  = feedbackRepository.countByFeedbackType(FeedbackType.SUGGESTION);
        long incidentCount    = feedbackRepository.countByFeedbackType(FeedbackType.INCIDENT);
        long complaintCount   = feedbackRepository.countByFeedbackType(FeedbackType.COMPLAINT);

        // Open = PENDING + IN_PROGRESS  |  Resolved = RESOLVED + CLOSED
        long openFeedback     = feedbackRepository.countByProcessingStatus(ProcessingStatus.PENDING)
                              + feedbackRepository.countByProcessingStatus(ProcessingStatus.IN_PROGRESS);
        long resolvedFeedback = feedbackRepository.countByProcessingStatus(ProcessingStatus.RESOLVED)
                              + feedbackRepository.countByProcessingStatus(ProcessingStatus.CLOSED);

        return TransitDashboardDTO.builder()
                // Destinations
                .totalDestinations(totalDestinations)
                .publishedDestinations(publishedDest)
                .scheduledDestinations(scheduledDest)
                .draftDestinations(draftDest)
                .archivedDestinations(archivedDest)
                // Travel Plans
                .totalTravelPlans(totalPlans)
                .submittedPlans(submittedPlans)
                .inPreparationPlans(prepPlans)
                .approvedPlans(approvedPlans)
                .rejectedPlans(rejectedPlans)
                .completedPlans(completedPlans)
                // Feedback
                .totalFeedback(totalFeedback)
                .reviewCount(reviewCount)
                .suggestionCount(suggestionCount)
                .incidentCount(incidentCount)
                .complaintCount(complaintCount)
                .openFeedback(openFeedback)
                .resolvedFeedback(resolvedFeedback)
                .build();
    }

    private void validateAdmin(Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedTravelAccessException("Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedTravelAccessException("User " + adminId + " is not an admin");
        }
    }
}
