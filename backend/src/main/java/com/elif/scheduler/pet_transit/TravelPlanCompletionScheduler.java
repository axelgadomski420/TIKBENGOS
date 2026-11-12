package com.elif.scheduler.pet_transit;

import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@AllArgsConstructor
@Slf4j
public class TravelPlanCompletionScheduler {

    private final TravelPlanRepository travelPlanRepository;

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void autoCompletePlans() {
        LocalDate today = LocalDate.now();

        List<TravelPlan> toComplete = travelPlanRepository.findByStatusAndReturnDateLessThanEqual(
                TravelPlanStatus.APPROVED,
                today
        );

        if (toComplete.isEmpty()) {
            return;
        }

        toComplete.forEach(plan -> plan.setStatus(TravelPlanStatus.COMPLETED));

        travelPlanRepository.saveAll(toComplete);
        log.info("{} TravelPlan(s) auto-completed on {}", toComplete.size(), today);
    }
}
