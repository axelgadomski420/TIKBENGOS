package com.elif.services.pet_transit;

import com.elif.entities.pet_transit.SafetyChecklist;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.ChecklistCategory;
import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.pet_transit.enums.PriorityLevel;
import com.elif.entities.pet_transit.enums.TransportType;
import com.elif.repositories.pet_transit.SafetyChecklistRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@AllArgsConstructor
public class ChecklistGeneratorService {

    private final SafetyChecklistRepository checklistRepository;

    public void generateForPlan(TravelPlan plan) {
        if (checklistRepository.countByTravelPlanId(plan.getId()) > 0) {
            return;
        }

        List<SafetyChecklist> items = new ArrayList<>();

        Set<DocumentType> requiredDocs = plan.getDestination().getRequiredDocuments();

        if (requiredDocs != null && !requiredDocs.isEmpty()) {
            requiredDocs.forEach(docType -> {
                String title = switch (docType) {
                    case PET_PASSPORT -> "Upload Pet Passport";
                    case RABIES_VACCINE -> "Upload Rabies Vaccine Certificate";
                    case HEALTH_CERTIFICATE -> "Upload Health Certificate";
                    case TRANSPORT_AUTHORIZATION -> "Upload Transport Authorization";
                };
                items.add(buildItem(plan, title,
                        ChecklistCategory.DOCUMENT,
                        PriorityLevel.HIGH,
                        true,
                        "DOC_" + docType.name()));
            });
        }

        items.add(buildItem(plan,
                "Verify pet is allowed on chosen transport",
                ChecklistCategory.TRANSPORT,
                PriorityLevel.HIGH, true,
                "TRANSPORT_COMPLIANCE"));

        if (plan.getCageLength() != null || plan.getAnimalWeight() != null) {
            items.add(buildItem(plan,
                    "Prepare and inspect pet carrier / cage",
                    ChecklistCategory.TRANSPORT,
                    PriorityLevel.HIGH, true,
                    "CAGE_READY"));
        }

        if (plan.getTransportType() == TransportType.PLANE) {
            items.add(buildItem(plan,
                    "Check airline pet policy and cabin rules",
                    ChecklistCategory.TRANSPORT,
                    PriorityLevel.HIGH, true,
                    "AIRLINE_POLICY"));
        }

        items.add(buildItem(plan,
                "Schedule pre-travel vet checkup",
                ChecklistCategory.HEALTH,
                PriorityLevel.MEDIUM, false,
                "VET_CHECKUP"));

        items.add(buildItem(plan,
                "Prepare pet medications if needed",
                ChecklistCategory.HEALTH,
                PriorityLevel.MEDIUM, false,
                "MEDICATIONS"));

        boolean longTrip =
                plan.getEstimatedTravelHours() != null
                        && plan.getEstimatedTravelHours().compareTo(BigDecimal.valueOf(2)) >= 0;

        if (longTrip) {
            items.add(buildItem(plan,
                    "Prepare sufficient water supply for the trip",
                    ChecklistCategory.HYDRATION,
                    PriorityLevel.MEDIUM, false,
                    "WATER_SUPPLY"));

            boolean drivingOrTrain =
                    plan.getTransportType() == TransportType.CAR
                            || plan.getTransportType() == TransportType.TRAIN;

            if (drivingOrTrain && plan.getHydrationIntervalMinutes() != null) {
                items.add(buildItem(plan,
                        "Plan hydration stops every "
                                + plan.getHydrationIntervalMinutes()
                                + " minutes",
                        ChecklistCategory.HYDRATION,
                        PriorityLevel.MEDIUM, false,
                        "HYDRATION_STOPS"));
            }
        }

        items.add(buildItem(plan,
                "Pack comfort items (blanket, toys, familiar scents)",
                ChecklistCategory.COMFORT,
                PriorityLevel.LOW, false,
                "COMFORT_ITEMS"));

        items.add(buildItem(plan,
                "Ensure pet is calm and relaxed before departure",
                ChecklistCategory.COMFORT,
                PriorityLevel.LOW, false,
                "PET_CALM"));

        checklistRepository.saveAll(items);
    }

    private SafetyChecklist buildItem(
            TravelPlan plan,
            String title,
            ChecklistCategory category,
            PriorityLevel priority,
            boolean mandatory,
            String taskCode) {

        return SafetyChecklist.builder()
                .travelPlan(plan)
                .title(title)
                .category(category)
                .priorityLevel(priority)
                .mandatory(mandatory)
                .completed(false)
                .taskCode(taskCode)
                .build();
    }
}
