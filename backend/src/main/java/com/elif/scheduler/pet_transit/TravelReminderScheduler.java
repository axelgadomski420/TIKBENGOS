package com.elif.scheduler.pet_transit;

import com.elif.entities.notification.enums.NotificationType;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import com.elif.services.notification.AppNotificationService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Component
@AllArgsConstructor
@Slf4j
public class TravelReminderScheduler {

    private final TravelPlanRepository travelPlanRepository;
    private final AppNotificationService appNotificationService;

    // Runs every day at 20:00
    @Scheduled(cron = "0 10 10 * * *")
    @Transactional
    public void sendTravelReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        log.info("[REMINDER] Starting travel reminder job for travelDate={}", tomorrow);

        List<TravelPlan> plansForTomorrow = travelPlanRepository
                .findByStatusAndTravelDate(TravelPlanStatus.APPROVED, tomorrow);
        if (plansForTomorrow == null) {
            plansForTomorrow = Collections.emptyList();
        }

        int sentCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        for (TravelPlan plan : plansForTomorrow) {
            if (plan == null) {
                skippedCount++;
                log.warn("[REMINDER] Skipping null plan in scheduler result list");
                continue;
            }

            try {
                Long planId = plan.getId();
                if (plan.getOwner() == null || plan.getOwner().getId() == null) {
                    skippedCount++;
                    log.warn("[REMINDER] Skipping plan {} because owner/userId is missing", planId);
                    continue;
                }
                if (plan.getDestination() == null) {
                    skippedCount++;
                    log.warn("[REMINDER] Skipping plan {} because destination is missing", planId);
                    continue;
                }

                String destinationTitle = plan.getDestination().getTitle();
                if (destinationTitle == null || destinationTitle.isBlank()) {
                    destinationTitle = "your destination";
                }

                appNotificationService.create(
                        plan.getOwner().getId(),
                        null,
                        NotificationType.TRAVEL_REMINDER,
                        "Travel reminder",
                        "Your trip to "
                                + destinationTitle
                                + " is tomorrow. Make sure your travel documents are ready.",
                        "/app/transit/plans/" + planId,
                        "TRAVEL_PLAN",
                        planId);
                sentCount++;
                log.info("[REMINDER] Sent reminder for plan {}", planId);
            } catch (Exception ex) {
                failedCount++;
                log.error("[REMINDER] Failed to send reminder for plan {}", plan.getId(), ex);
            }
        }

        log.info(
                "[REMINDER] Travel reminder job finished for travelDate={} total={} sent={} skipped={} failed={}",
                tomorrow,
                plansForTomorrow.size(),
                sentCount,
                skippedCount,
                failedCount);
    }
}
