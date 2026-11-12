package com.elif.scheduler.community;

import com.elif.repositories.community.CommunityMemberRepository;
import com.elif.services.community.CommunityNotificationEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class CommunityWeeklyDigestScheduler {

    private final CommunityMemberRepository communityMemberRepository;
    private final CommunityNotificationEmailService communityNotificationEmailService;

    @Scheduled(cron = "${app.notifications.community.weekly-digest.cron:0 0 9 * * MON}")
    public void sendWeeklyDigests() {
        communityMemberRepository.findByWeeklyDigestEnabledTrue()
                .forEach(communityNotificationEmailService::sendWeeklyDigestEmail);
    }
}
