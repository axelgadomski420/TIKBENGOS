package com.elif.scheduler.events;

import com.elif.services.events.interfaces.IEventWaitlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WaitlistExpirationScheduler {

    private final IEventWaitlistService waitlistService;

    @Scheduled(cron = "${app.scheduler.waitlist.cron:0 */5 * * * *}")
    public void processExpiredWaitlistEntries() {
        log.debug("Verification des delais expires en liste d'attente...");
        try {
            waitlistService.expireOverdueNotifications();
        } catch (Exception e) {
            log.error("Erreur dans le scheduler : {}", e.getMessage(), e);
        }
    }
}