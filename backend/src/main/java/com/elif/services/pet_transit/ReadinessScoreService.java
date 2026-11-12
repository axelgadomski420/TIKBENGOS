package com.elif.services.pet_transit;

import com.elif.entities.pet_transit.SafetyChecklist;
import com.elif.entities.pet_transit.TravelDocument;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.pet_transit.enums.DocumentValidationStatus;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.exceptions.pet_transit.TravelPlanNotFoundException;
import com.elif.repositories.pet_transit.SafetyChecklistRepository;
import com.elif.repositories.pet_transit.TravelDocumentRepository;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@AllArgsConstructor
@Transactional
public class ReadinessScoreService {

    private static final BigDecimal DOCUMENT_MAX_POINTS = BigDecimal.valueOf(40);
    private static final BigDecimal CHECKLIST_MAX_POINTS = BigDecimal.valueOf(20);
    private static final BigDecimal OPTIONAL_DATA_MAX_POINTS = BigDecimal.valueOf(20);
    private static final BigDecimal ADMIN_VALIDATION_MAX_POINTS = BigDecimal.valueOf(20);
    private static final BigDecimal PET_TRAVEL_INFO_FIELD_COUNT = BigDecimal.valueOf(4);

    private final TravelPlanRepository travelPlanRepository;
    private final TravelDocumentRepository travelDocumentRepository;
    private final SafetyChecklistRepository safetyChecklistRepository;

    public BigDecimal recalculateAndSave(Long travelPlanId) {
        TravelPlan travelPlan = travelPlanRepository.findById(travelPlanId)
                .orElseThrow(() -> new TravelPlanNotFoundException("TravelPlan not found with id: " + travelPlanId));

        BigDecimal documentPoints = calculateDocumentPoints(travelPlan);
        BigDecimal checklistPoints = calculateChecklistPoints(travelPlan);
        BigDecimal optionalDataPoints = calculateOptionalDataPoints(travelPlan);
        BigDecimal adminValidationPoints = calculateAdminValidationPoints(travelPlan);

        // 40 (documents) + 20 (mandatory checklist) + 20 (pet/travel info) + 20 (final admin validation)
        BigDecimal finalScore = documentPoints
                .add(checklistPoints)
                .add(optionalDataPoints)
                .add(adminValidationPoints)
                .setScale(2, RoundingMode.HALF_UP);

        // Ensure score is between 0 and 100
        if (finalScore.compareTo(BigDecimal.ZERO) < 0) {
            finalScore = BigDecimal.ZERO;
        } else if (finalScore.compareTo(BigDecimal.valueOf(100)) > 0) {
            finalScore = BigDecimal.valueOf(100);
        }

        travelPlan.setReadinessScore(finalScore);
        travelPlanRepository.save(travelPlan);

        return finalScore;
    }

    private BigDecimal calculateDocumentPoints(TravelPlan travelPlan) {
        Set<DocumentType> requiredDocs = travelPlan.getDestination() != null
                ? travelPlan.getDestination().getRequiredDocuments()
                : null;

        if (requiredDocs == null || requiredDocs.isEmpty()) {
            return DOCUMENT_MAX_POINTS;
        }

        List<TravelDocument> uploadedDocuments = travelDocumentRepository.findByTravelPlanId(travelPlan.getId());
        Map<DocumentType, TravelDocument> latestDocumentByType = new EnumMap<>(DocumentType.class);

        for (TravelDocument document : uploadedDocuments) {
            DocumentType documentType = document.getDocumentType();
            if (documentType == null) {
                continue;
            }

            TravelDocument existing = latestDocumentByType.get(documentType);
            if (existing == null || isMoreRecent(document, existing)) {
                latestDocumentByType.put(documentType, document);
            }
        }

        BigDecimal achievedWeight = BigDecimal.ZERO;

        for (DocumentType requiredType : requiredDocs) {
            TravelDocument document = latestDocumentByType.get(requiredType);
            DocumentValidationStatus status = document != null ? document.getValidationStatus() : null;
            achievedWeight = achievedWeight.add(documentContribution(status));
        }

        BigDecimal ratio = achievedWeight
                .divide(BigDecimal.valueOf(requiredDocs.size()), 4, RoundingMode.HALF_UP);

        return ratio.multiply(DOCUMENT_MAX_POINTS)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal documentContribution(DocumentValidationStatus status) {
        if (status == null) {
            return BigDecimal.ZERO;
        }

        return switch (status) {
            case VALID, PENDING, INCOMPLETE -> BigDecimal.ONE;
            case REJECTED, EXPIRED -> BigDecimal.ZERO;
        };
    }

    private boolean isMoreRecent(TravelDocument candidate, TravelDocument existing) {
        LocalDateTime candidateTimestamp = resolveDocumentTimestamp(candidate);
        LocalDateTime existingTimestamp = resolveDocumentTimestamp(existing);

        int byTimestamp = candidateTimestamp.compareTo(existingTimestamp);
        if (byTimestamp != 0) {
            return byTimestamp > 0;
        }

        Long candidateId = candidate.getId();
        Long existingId = existing.getId();
        if (candidateId == null) {
            return false;
        }
        if (existingId == null) {
            return true;
        }

        return candidateId > existingId;
    }

    private LocalDateTime resolveDocumentTimestamp(TravelDocument document) {
        if (document.getUpdatedAt() != null) {
            return document.getUpdatedAt();
        }
        if (document.getUploadedAt() != null) {
            return document.getUploadedAt();
        }

        return LocalDateTime.MIN;
    }

    private BigDecimal calculateChecklistPoints(TravelPlan travelPlan) {
        List<SafetyChecklist> allItems = safetyChecklistRepository.findByTravelPlanId(travelPlan.getId());

        // Filter mandatory items
        long totalMandatory = allItems.stream()
                .filter(SafetyChecklist::isMandatory)
                .count();

        if (totalMandatory == 0) {
            return CHECKLIST_MAX_POINTS;
        }

        long completedMandatory = allItems.stream()
                .filter(item -> item.isMandatory() && item.isCompleted())
                .count();

        BigDecimal ratio = BigDecimal.valueOf(completedMandatory)
                .divide(BigDecimal.valueOf(totalMandatory), 4, RoundingMode.HALF_UP);

        return ratio.multiply(CHECKLIST_MAX_POINTS)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateOptionalDataPoints(TravelPlan travelPlan) {
        int filledCount = 0;

        if (isPositive(travelPlan.getAnimalWeight())) {
            filledCount++;
        }
        if (isPositive(travelPlan.getCageLength())) {
            filledCount++;
        }
        if (isPositive(travelPlan.getCageWidth())) {
            filledCount++;
        }
        if (isPositive(travelPlan.getCageHeight())) {
            filledCount++;
        }

        BigDecimal ratio = BigDecimal.valueOf(filledCount)
                .divide(PET_TRAVEL_INFO_FIELD_COUNT, 4, RoundingMode.HALF_UP)
                .multiply(OPTIONAL_DATA_MAX_POINTS)
                .setScale(2, RoundingMode.HALF_UP);

        return ratio;
    }

    private boolean isPositive(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) > 0;
    }

    private BigDecimal calculateAdminValidationPoints(TravelPlan travelPlan) {
        TravelPlanStatus status = travelPlan.getStatus();

        if (status == TravelPlanStatus.APPROVED || status == TravelPlanStatus.COMPLETED) {
            return ADMIN_VALIDATION_MAX_POINTS;
        }

        return BigDecimal.ZERO;
    }
}
