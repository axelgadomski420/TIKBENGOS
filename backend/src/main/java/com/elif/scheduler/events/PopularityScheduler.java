package com.elif.scheduler.events;

import com.elif.services.events.interfaces.IEventPopularityTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler de maintenance du service de popularité.
 *
 * Tâches :
 *  1. Chaque 1er du mois à 3h00 → purge des interactions > 6 mois
 *
 * Activer @EnableScheduling sur la classe principale Spring Boot.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PopularityScheduler {

    private final IEventPopularityTrackingService popularityService;

    /**
     * Purge mensuelle des interactions anciennes.
     * Conserve 6 mois d'historique pour les tendances long terme.
     *
     * cron : "0 0 3 1 * *" = le 1er de chaque mois à 03h00
     */
    @Scheduled(cron = "0 0 3 1 * *")
    public void cleanOldInteractions() {
        log.info("[SCHEDULER] Début purge interactions popularity...");
        int deleted = popularityService.cleanOldInteractions(6);
        log.info("[SCHEDULER] Purge terminée : {} interactions supprimées", deleted);
    }
}