package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.request.TravelPlanCreateRequest;
import com.elif.dto.pet_transit.request.TravelPlanUpdateRequest;
import com.elif.dto.pet_transit.response.TravelPlanResponse;
import com.elif.dto.pet_transit.response.TravelPlanSummaryResponse;
import com.elif.entities.pet_transit.TravelDestination;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.CurrencyCode;
import com.elif.entities.pet_transit.enums.DestinationStatus;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.entities.notification.enums.NotificationType;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.exceptions.pet_transit.InvalidPlanStatusException;
import com.elif.exceptions.pet_transit.TravelDestinationNotFoundException;
import com.elif.exceptions.pet_transit.TravelPlanNotFoundException;
import com.elif.exceptions.pet_transit.UnauthorizedTravelAccessException;
import com.elif.repositories.pet_transit.TravelDestinationRepository;
import com.elif.repositories.pet_transit.TravelFeedbackRepository;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import com.elif.repositories.pet_transit.specifications.TravelPlanSpecifications;
import com.elif.repositories.user.UserRepository;
import com.elif.services.notification.AppNotificationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Locale;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TravelPlanService {

    private static final BigDecimal MIN_SUBMIT_SCORE = BigDecimal.valueOf(70);
    private static final BigDecimal MIN_SCORE = BigDecimal.ZERO;
    private static final BigDecimal MAX_SCORE = BigDecimal.valueOf(100);
        private static final Set<String> EURO_COUNTRY_KEYS = Set.of(
            "AT", "AUT", "AUSTRIA",
            "BE", "BEL", "BELGIUM",
            "CY", "CYP", "CYPRUS",
            "DE", "DEU", "GERMANY",
            "EE", "EST", "ESTONIA",
            "ES", "ESP", "SPAIN",
            "FI", "FIN", "FINLAND",
            "FR", "FRA", "FRANCE",
            "GR", "GRC", "GREECE",
            "HR", "HRV", "CROATIA",
            "IE", "IRL", "IRELAND",
            "IT", "ITA", "ITALY",
            "LT", "LTU", "LITHUANIA",
            "LU", "LUX", "LUXEMBOURG",
            "LV", "LVA", "LATVIA",
            "MT", "MLT", "MALTA",
            "NL", "NLD", "NETHERLANDS",
            "PT", "PRT", "PORTUGAL",
            "SI", "SVN", "SLOVENIA",
            "SK", "SVK", "SLOVAKIA"
        );

        private static final Set<TravelPlanStatus> CLIENT_DELETABLE_STATUSES = EnumSet.of(
            TravelPlanStatus.DRAFT,
            TravelPlanStatus.IN_PREPARATION,
            TravelPlanStatus.REJECTED,
            TravelPlanStatus.CANCELLED
    );

    private final TravelPlanRepository travelPlanRepository;
    private final TravelDestinationRepository travelDestinationRepository;
        private final TravelFeedbackRepository travelFeedbackRepository;
    private final UserRepository userRepository;
    private final ChecklistGeneratorService checklistGeneratorService;
    private final ReadinessScoreService readinessScoreService;
    private final PetTransitEmailService petTransitEmailService;
    private final AppNotificationService appNotificationService;

    public TravelPlanResponse createTravelPlan(Long ownerId, TravelPlanCreateRequest req) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new UnauthorizedTravelAccessException("Owner user not found"));

        TravelDestination destination = travelDestinationRepository.findById(req.getDestinationId())
                .orElseThrow(() ->
                        new TravelDestinationNotFoundException("Destination not found with id: " + req.getDestinationId()));

        if (destination.getStatus() != DestinationStatus.PUBLISHED) {
            throw new TravelDestinationNotFoundException(
                    "Destination is not available for planning with id: " + req.getDestinationId());
        }

        TravelPlan travelPlan = TravelPlan.builder()
                .owner(owner)
                .petId(req.getPetId())
                .destination(destination)
                .origin(req.getOrigin())
                .transportType(req.getTransportType())
                .travelDate(req.getTravelDate())
                .returnDate(req.getReturnDate())
                .estimatedTravelHours(req.getEstimatedTravelHours())
                .estimatedTravelCost(req.getEstimatedTravelCost())
                .currency(resolveCurrencyForDestination(destination, req.getEstimatedTravelCost()))
                .animalWeight(req.getAnimalWeight())
                .cageLength(req.getCageLength())
                .cageWidth(req.getCageWidth())
                .cageHeight(req.getCageHeight())
                .hydrationIntervalMinutes(req.getHydrationIntervalMinutes())
                .requiredStops(req.getRequiredStops())
                .status(TravelPlanStatus.IN_PREPARATION)
                .build();

        TravelPlan saved = travelPlanRepository.save(travelPlan);
        checklistGeneratorService.generateForPlan(saved);
        readinessScoreService.recalculateAndSave(saved.getId());
        return toResponse(saved);
    }

    public TravelPlanResponse updateTravelPlan(Long planId, Long ownerId, TravelPlanUpdateRequest req) {
        TravelPlan travelPlan = getTravelPlanAndCheckOwnership(planId, ownerId);

        if (travelPlan.getStatus() != TravelPlanStatus.DRAFT
                && travelPlan.getStatus() != TravelPlanStatus.IN_PREPARATION
                && travelPlan.getStatus() != TravelPlanStatus.REJECTED) {
            throw new InvalidPlanStatusException(
                    "Plan cannot be updated with status: " + travelPlan.getStatus());
        }

        reopenRejectedPlanForClientUpdate(travelPlan);

        travelPlan.setPetId(req.getPetId());
        if (req.getOrigin() != null) {
            travelPlan.setOrigin(req.getOrigin());
        }
        if (req.getTransportType() != null) {
            travelPlan.setTransportType(req.getTransportType());
        }
        if (req.getTravelDate() != null) {
            travelPlan.setTravelDate(req.getTravelDate());
        }
        if (req.getReturnDate() != null) {
            travelPlan.setReturnDate(req.getReturnDate());
        }
        if (req.getEstimatedTravelHours() != null) {
            travelPlan.setEstimatedTravelHours(req.getEstimatedTravelHours());
        }
        if (req.getEstimatedTravelCost() != null) {
            travelPlan.setEstimatedTravelCost(req.getEstimatedTravelCost());
        }
        if (req.getCurrency() != null) {
            travelPlan.setCurrency(req.getCurrency());
        }
        if (req.getAnimalWeight() != null) {
            travelPlan.setAnimalWeight(req.getAnimalWeight());
        }
        if (req.getCageLength() != null) {
            travelPlan.setCageLength(req.getCageLength());
        }
        if (req.getCageWidth() != null) {
            travelPlan.setCageWidth(req.getCageWidth());
        }
        if (req.getCageHeight() != null) {
            travelPlan.setCageHeight(req.getCageHeight());
        }
        if (req.getHydrationIntervalMinutes() != null) {
            travelPlan.setHydrationIntervalMinutes(req.getHydrationIntervalMinutes());
        }
        if (req.getRequiredStops() != null) {
            travelPlan.setRequiredStops(req.getRequiredStops());
        }

        enforceCurrencyForDestination(travelPlan);

        TravelPlan updated = travelPlanRepository.save(travelPlan);
        BigDecimal recalculatedScore = readinessScoreService.recalculateAndSave(updated.getId());
        updated.setReadinessScore(recalculatedScore);
        return toResponse(updated);
    }

    public Page<TravelPlanSummaryResponse> getMyPlans(Long ownerId) {
        return getMyPlans(ownerId, null, null, null, null, 0, 1000);
    }

    public Page<TravelPlanSummaryResponse> getMyPlans(
            Long ownerId,
            TravelPlanStatus status,
            String search,
            LocalDate startDate,
            LocalDate endDate,
            int page,
            int size
    ) {
        LocalDate normalizedStartDate = normalizeStartDate(startDate, endDate);
        LocalDate normalizedEndDate = normalizeEndDate(startDate, endDate);

        Specification<TravelPlan> specification = TravelPlanSpecifications.byFilters(
                ownerId,
                false,
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

        return travelPlanRepository.findAll(specification, pageable)
            .map(this::toSummaryResponse);
    }

    public TravelPlanResponse getPlanById(Long planId, Long ownerId) {
        TravelPlan travelPlan = getTravelPlanAndCheckOwnership(planId, ownerId);
        return toResponse(travelPlan);
    }

    public TravelPlanResponse getPlanByIdForAdmin(Long planId, Long adminId) {
        getAdminUser(adminId);
        TravelPlan travelPlan = getAdminVisiblePlanOrThrow(planId);
        return toResponse(travelPlan);
    }

    public TravelPlanResponse submitPlan(Long planId, Long ownerId) {
        TravelPlan travelPlan = getTravelPlanAndCheckOwnership(planId, ownerId);

        if (travelPlan.getStatus() != TravelPlanStatus.IN_PREPARATION
                && travelPlan.getStatus() != TravelPlanStatus.REJECTED) {
            throw new InvalidPlanStatusException(
                    "Plan cannot be submitted with status: " + travelPlan.getStatus());
        }

        reopenRejectedPlanForClientUpdate(travelPlan);

        BigDecimal recalculatedScore = readinessScoreService.recalculateAndSave(planId);
        travelPlan.setReadinessScore(recalculatedScore);

        if (recalculatedScore.compareTo(MIN_SUBMIT_SCORE) < 0) {
            throw new InvalidPlanStatusException("Plan readiness score must be >= 70 to submit");
        }

        travelPlan.setStatus(TravelPlanStatus.SUBMITTED);
        travelPlan.setSubmittedAt(LocalDateTime.now());
        clearAdminReviewMetadata(travelPlan);
        travelPlan.setAdminVisible(true);
        travelPlan.setAdminHiddenAt(null);
        travelPlan.setAdminHiddenBy(null);

        TravelPlan updated = travelPlanRepository.save(travelPlan);
        return toResponse(updated);
    }

    public TravelPlanResponse approvePlan(Long planId, Long adminId, String comment) {
        TravelPlan travelPlan = getAdminVisiblePlanOrThrow(planId);

        if (travelPlan.getStatus() != TravelPlanStatus.SUBMITTED) {
            throw new InvalidPlanStatusException(
                    "Plan cannot be approved with status: " + travelPlan.getStatus());
        }

        User admin = getAdminUser(adminId);

        travelPlan.setStatus(TravelPlanStatus.APPROVED);
        travelPlan.setReviewedAt(LocalDateTime.now());
        travelPlan.setReviewedByAdmin(admin);
        travelPlan.setAdminDecisionComment(comment);

        TravelPlan updated = travelPlanRepository.save(travelPlan);
        BigDecimal recalculatedScore = readinessScoreService.recalculateAndSave(updated.getId());
        updated.setReadinessScore(recalculatedScore);

        appNotificationService.create(
            updated.getOwner().getId(),
            adminId,
            NotificationType.TRAVEL_PLAN_APPROVED,
            "Travel plan approved",
            "Your travel plan to "
                + updated.getDestination().getTitle()
                + " has been approved. You are ready to travel!",
            "/app/transit/plans/" + updated.getId(),
            "TRAVEL_PLAN",
            updated.getId());

        String recipientEmail = resolveOwnerEmailForLogging(updated);
        try {
            petTransitEmailService.sendApprovalEmail(updated);
            log.info("Travel plan approval email sent to {} for plan {}", recipientEmail, updated.getId());
        } catch (Exception ex) {
            log.error("Travel plan {} approved but failed to send email to {}",
                    updated.getId(), recipientEmail, ex);
        }

        return toResponse(updated);
    }

    public TravelPlanResponse rejectPlan(Long planId, Long adminId, String comment) {
        TravelPlan travelPlan = getAdminVisiblePlanOrThrow(planId);

        if (travelPlan.getStatus() != TravelPlanStatus.SUBMITTED) {
            throw new InvalidPlanStatusException(
                    "Plan cannot be rejected with status: " + travelPlan.getStatus());
        }

        User admin = getAdminUser(adminId);

        travelPlan.setStatus(TravelPlanStatus.REJECTED);
        travelPlan.setReviewedAt(LocalDateTime.now());
        travelPlan.setReviewedByAdmin(admin);
        travelPlan.setAdminDecisionComment(comment);

        TravelPlan updated = travelPlanRepository.save(travelPlan);

        appNotificationService.create(
            updated.getOwner().getId(),
            adminId,
            NotificationType.TRAVEL_PLAN_REJECTED,
            "Travel plan rejected",
            "Your travel plan to "
                + updated.getDestination().getTitle()
                + " was not approved. Please check the admin comments and update your documents.",
            "/app/transit/plans/" + updated.getId(),
            "TRAVEL_PLAN",
            updated.getId());

        String recipientEmail = resolveOwnerEmailForLogging(updated);
        try {
            petTransitEmailService.sendRejectionEmail(updated, comment);
            log.info("Travel plan rejection email sent to {} for plan {}", recipientEmail, updated.getId());
        } catch (Exception ex) {
            log.error("Travel plan {} rejected but failed to send email to {}",
                    updated.getId(), recipientEmail, ex);
        }

        return toResponse(updated);
    }

    private String resolveOwnerEmailForLogging(TravelPlan travelPlan) {
        if (travelPlan == null || travelPlan.getOwner() == null || travelPlan.getOwner().getEmail() == null) {
            return "<missing-email>";
        }

        String email = travelPlan.getOwner().getEmail().trim();
        return email.isEmpty() ? "<missing-email>" : email;
    }

    public TravelPlanResponse completePlan(Long planId, Long ownerId) {
        TravelPlan travelPlan = getTravelPlanAndCheckOwnership(planId, ownerId);

        if (travelPlan.getStatus() != TravelPlanStatus.APPROVED) {
            throw new InvalidPlanStatusException(
                    "Plan cannot be completed with status: " + travelPlan.getStatus());
        }

        travelPlan.setStatus(TravelPlanStatus.COMPLETED);

        TravelPlan updated = travelPlanRepository.save(travelPlan);
        BigDecimal recalculatedScore = readinessScoreService.recalculateAndSave(updated.getId());
        updated.setReadinessScore(recalculatedScore);
        return toResponse(updated);
    }

    public TravelPlanResponse cancelPlan(Long planId, Long ownerId) {
        TravelPlan travelPlan = getTravelPlanAndCheckOwnership(planId, ownerId);

        if (travelPlan.getStatus() != TravelPlanStatus.SUBMITTED
                && travelPlan.getStatus() != TravelPlanStatus.APPROVED) {
            throw new InvalidPlanStatusException("Only SUBMITTED or APPROVED plans can be cancelled.");
        }

        travelPlan.setStatus(TravelPlanStatus.CANCELLED);

        TravelPlan updated = travelPlanRepository.save(travelPlan);
        BigDecimal recalculatedScore = readinessScoreService.recalculateAndSave(updated.getId());
        updated.setReadinessScore(recalculatedScore);
        return toResponse(updated);
    }

    public void deletePlan(Long planId, Long requesterId) {
        TravelPlan travelPlan = travelPlanRepository.findById(planId)
            .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found with id: " + planId));

        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new UnauthorizedTravelAccessException("Requester user not found"));

        boolean isAdmin = requester.getRole() == Role.ADMIN;
        boolean isOwner = travelPlan.getOwner().getId().equals(requesterId);

        if (!isAdmin && !isOwner) {
            throw new UnauthorizedTravelAccessException("Only the owner or an admin can delete this plan");
        }

        if (isAdmin) {
            if (travelPlan.getStatus() == TravelPlanStatus.COMPLETED
                && !travelFeedbackRepository.findByTravelPlanId(planId).isEmpty()) {
            throw new InvalidPlanStatusException(
                "Cannot delete a completed plan that has associated feedback."
            );
            }

            travelPlanRepository.delete(travelPlan);
            return;
        }

        if (!CLIENT_DELETABLE_STATUSES.contains(travelPlan.getStatus())) {
            throw new InvalidPlanStatusException(
                "Clients can only delete plans in DRAFT, IN_PREPARATION, REJECTED or CANCELLED status."
            );
        }

        travelPlanRepository.delete(travelPlan);
    }

    public Page<TravelPlanResponse> getAllPlansForAdmin(Long adminId) {
        return getAllPlansForAdmin(adminId, null, null, null, null, 0, 1000);
    }

    public Page<TravelPlanResponse> getAllPlansForAdmin(
            Long adminId,
            TravelPlanStatus status,
            String search,
            LocalDate startDate,
            LocalDate endDate,
            int page,
            int size
    ) {
        getAdminUser(adminId);

        LocalDate normalizedStartDate = normalizeStartDate(startDate, endDate);
        LocalDate normalizedEndDate = normalizeEndDate(startDate, endDate);

        Specification<TravelPlan> specification = TravelPlanSpecifications.byFilters(
                null,
                true,
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

        return travelPlanRepository.findAll(specification, pageable)
            .map(this::toResponse);
    }

    public List<TravelPlanResponse> getSubmittedPlans(Long adminId) {
        return getAllPlansForAdmin(adminId, TravelPlanStatus.SUBMITTED, null, null, null, 0, 1000)
            .getContent();
    }

    public void removePlanFromAdminView(Long planId, Long adminId) {
        User admin = getAdminUser(adminId);

        TravelPlan travelPlan = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found with id: " + planId));

        if (Boolean.FALSE.equals(travelPlan.getAdminVisible())) {
            return;
        }

        travelPlan.setAdminVisible(false);
        travelPlan.setAdminHiddenAt(LocalDateTime.now());
        travelPlan.setAdminHiddenBy(admin);

        travelPlanRepository.save(travelPlan);
    }

    public void updateReadinessScore(Long planId, BigDecimal score) {
        TravelPlan travelPlan = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found with id: " + planId));

        if (score == null) {
            throw new IllegalArgumentException("Readiness score cannot be null");
        }

        BigDecimal boundedScore = score;
        if (boundedScore.compareTo(MIN_SCORE) < 0) {
            boundedScore = MIN_SCORE;
        } else if (boundedScore.compareTo(MAX_SCORE) > 0) {
            boundedScore = MAX_SCORE;
        }

        travelPlan.setReadinessScore(boundedScore);
        travelPlanRepository.save(travelPlan);
    }

    private TravelPlan getTravelPlanAndCheckOwnership(Long planId, Long ownerId) {
        TravelPlan travelPlan = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found with id: " + planId));

        if (!travelPlan.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedTravelAccessException(
                    "User " + ownerId + " is not the owner of this plan");
        }

        return travelPlan;
    }

    private TravelPlan getTravelPlanAndCheckDeleteAccess(Long planId, Long requesterId) {
        TravelPlan travelPlan = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found with id: " + planId));

        if (!travelPlan.getOwner().getId().equals(requesterId)) {
            throw new UnauthorizedTravelAccessException(
                    "Only the owner can permanently delete this plan"
            );
        }

        return travelPlan;
    }

    private User getAdminUser(Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedTravelAccessException("Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedTravelAccessException("User " + adminId + " is not an admin");
        }

        return admin;
    }

    private TravelPlan getAdminVisiblePlanOrThrow(Long planId) {
        return travelPlanRepository.findAdminVisibleById(planId)
                .orElseThrow(() -> new TravelPlanNotFoundException("Plan not found with id: " + planId));
    }

    private void reopenRejectedPlanForClientUpdate(TravelPlan travelPlan) {
        if (travelPlan.getStatus() != TravelPlanStatus.REJECTED) {
            return;
        }

        travelPlan.setStatus(TravelPlanStatus.IN_PREPARATION);
        travelPlan.setSubmittedAt(null);
        clearAdminReviewMetadata(travelPlan);
        travelPlan.setAdminVisible(true);
        travelPlan.setAdminHiddenAt(null);
        travelPlan.setAdminHiddenBy(null);
    }

    private void clearAdminReviewMetadata(TravelPlan travelPlan) {
        travelPlan.setReviewedAt(null);
        travelPlan.setReviewedByAdmin(null);
        travelPlan.setAdminDecisionComment(null);
    }

    private TravelPlanResponse toResponse(TravelPlan travelPlan) {
        String ownerName = travelPlan.getOwner().getFirstName() + " " + travelPlan.getOwner().getLastName();

        Long destinationId = travelPlan.getDestination() != null ? travelPlan.getDestination().getId() : null;
        String destinationTitle = travelPlan.getDestination() != null ? travelPlan.getDestination().getTitle() : null;
        String destinationCountry = travelPlan.getDestination() != null ? travelPlan.getDestination().getCountry() : null;

        String reviewedByAdminName = null;
        if (travelPlan.getReviewedByAdmin() != null) {
            reviewedByAdminName = travelPlan.getReviewedByAdmin().getFirstName()
                    + " "
                    + travelPlan.getReviewedByAdmin().getLastName();
        }

        return TravelPlanResponse.builder()
                .id(travelPlan.getId())
                .ownerId(travelPlan.getOwner().getId())
                .ownerName(ownerName)
                .petId(travelPlan.getPetId())
                .destinationId(destinationId)
                .destinationTitle(destinationTitle)
                .destinationCountry(destinationCountry)
                .origin(travelPlan.getOrigin())
                .transportType(travelPlan.getTransportType())
                .travelDate(travelPlan.getTravelDate())
                .returnDate(travelPlan.getReturnDate())
                .estimatedTravelHours(travelPlan.getEstimatedTravelHours())
                .estimatedTravelCost(travelPlan.getEstimatedTravelCost())
                .currency(travelPlan.getCurrency())
                .animalWeight(travelPlan.getAnimalWeight())
                .cageLength(travelPlan.getCageLength())
                .cageWidth(travelPlan.getCageWidth())
                .cageHeight(travelPlan.getCageHeight())
                .hydrationIntervalMinutes(travelPlan.getHydrationIntervalMinutes())
                .requiredStops(travelPlan.getRequiredStops())
                .readinessScore(travelPlan.getReadinessScore())
                .safetyStatus(travelPlan.getSafetyStatus())
                .status(travelPlan.getStatus())
                .hasFeedback(hasFeedback(travelPlan.getId()))
                .adminDecisionComment(travelPlan.getAdminDecisionComment())
                .reviewedByAdminName(reviewedByAdminName)
                .submittedAt(travelPlan.getSubmittedAt())
                .reviewedAt(travelPlan.getReviewedAt())
                .createdAt(travelPlan.getCreatedAt())
                .updatedAt(travelPlan.getUpdatedAt())
                .build();
    }

    private TravelPlanSummaryResponse toSummaryResponse(TravelPlan travelPlan) {
        String destinationTitle = travelPlan.getDestination() != null ? travelPlan.getDestination().getTitle() : null;
        String destinationCountry = travelPlan.getDestination() != null ? travelPlan.getDestination().getCountry() : null;

        return TravelPlanSummaryResponse.builder()
                .id(travelPlan.getId())
                .destinationTitle(destinationTitle)
                .destinationCountry(destinationCountry)
                .travelDate(travelPlan.getTravelDate())
                .status(travelPlan.getStatus())
                .hasFeedback(hasFeedback(travelPlan.getId()))
                .readinessScore(travelPlan.getReadinessScore())
                .safetyStatus(travelPlan.getSafetyStatus())
                .createdAt(travelPlan.getCreatedAt())
                .build();
    }

    private boolean hasFeedback(Long planId) {
        return !travelFeedbackRepository.findByTravelPlanId(planId).isEmpty();
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

    private void enforceCurrencyForDestination(TravelPlan travelPlan) {
        if (travelPlan.getEstimatedTravelCost() == null
                || travelPlan.getEstimatedTravelCost().compareTo(BigDecimal.ZERO) <= 0) {
            travelPlan.setCurrency(null);
            return;
        }

        travelPlan.setCurrency(resolveCurrencyForDestination(
                travelPlan.getDestination(),
                travelPlan.getEstimatedTravelCost()
        ));
    }

    private CurrencyCode resolveCurrencyForDestination(TravelDestination destination, BigDecimal estimatedTravelCost) {
        if (estimatedTravelCost == null || estimatedTravelCost.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        String country = destination != null ? destination.getCountry() : null;
        String normalizedCountry = normalizeCountryKey(country);

        if (normalizedCountry.isEmpty()) {
            return CurrencyCode.USD;
        }

        if ("TN".equals(normalizedCountry)
                || "TUN".equals(normalizedCountry)
                || "TUNISIA".equals(normalizedCountry)
                || normalizedCountry.contains("TUNISIA")) {
            return CurrencyCode.TND;
        }

        String[] tokens = normalizedCountry.split(" ");
        for (String token : tokens) {
            if (EURO_COUNTRY_KEYS.contains(token)) {
                return CurrencyCode.EUR;
            }
        }

        if (EURO_COUNTRY_KEYS.contains(normalizedCountry)) {
            return CurrencyCode.EUR;
        }

        return CurrencyCode.USD;
    }

    private String normalizeCountryKey(String country) {
        String source = country == null ? "" : country;
        String withoutAccents = Normalizer.normalize(source, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");

        return withoutAccents
                .replaceAll("[^a-zA-Z0-9]", " ")
                .replaceAll("\\s+", " ")
                .trim()
                .toUpperCase(Locale.ROOT);
    }
}
