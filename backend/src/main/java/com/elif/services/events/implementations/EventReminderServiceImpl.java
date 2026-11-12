package com.elif.services.events.implementations;

import com.elif.entities.events.Event;
import com.elif.entities.events.EventReminder;
import com.elif.entities.events.ReminderType;
import com.elif.entities.user.User;
import com.elif.repositories.events.EventReminderRepository;
import com.elif.services.events.interfaces.IEventReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EventReminderServiceImpl implements IEventReminderService {

    private final EventReminderRepository reminderRepository;
    private final EventEmailService eventEmailService;

    @Override
    public void scheduleReminders(Event event, User user) {
        if (event == null || user == null || event.getStartDate() == null) {
            return;
        }

        LocalDateTime eventStart = event.getStartDate();
        List<EventReminder> reminders = new ArrayList<>();

        addReminderIfNeeded(reminders, event, user, eventStart.minusDays(2), ReminderType.J2);
        addReminderIfNeeded(reminders, event, user, eventStart.minusHours(24), ReminderType.H24);
        addReminderIfNeeded(reminders, event, user, eventStart.minusHours(2), ReminderType.H2);

        if (!reminders.isEmpty()) {
            reminderRepository.saveAll(reminders);
            log.info("{} reminder(s) scheduled for {} on event {}", reminders.size(), user.getEmail(), event.getId());
        }
    }

    private void addReminderIfNeeded(List<EventReminder> reminders, Event event, User user, LocalDateTime reminderTime, ReminderType type) {
        if (reminderTime.isAfter(LocalDateTime.now())
                && !reminderRepository.existsByEventIdAndUserIdAndType(event.getId(), user.getId(), type)) {
            reminders.add(EventReminder.builder()
                    .event(event)
                    .user(user)
                    .reminderTime(reminderTime)
                    .type(type)
                    .build());
        }
    }

    @Override
    public void cancelReminders(Long eventId, Long userId) {
        reminderRepository.deleteByEventIdAndUserId(eventId, userId);
        log.info("Cancelled reminders for eventId={} userId={}", eventId, userId);
    }

    @Override
    public void cancelAllRemindersForEvent(Long eventId) {
        reminderRepository.deleteByEventId(eventId);
        log.info("Cancelled all reminders for eventId={}", eventId);
    }

    @Scheduled(cron = "0 */30 * * * *")
    @Override
    public void sendPendingReminders() {
        List<EventReminder> reminders = reminderRepository.findByReminderTimeBefore(LocalDateTime.now());
        if (reminders.isEmpty()) {
            return;
        }

        int sentCount = 0;
        int failedCount = 0;

        for (EventReminder reminder : reminders) {
            try {
                sendReminder(reminder);
                reminderRepository.delete(reminder);
                sentCount++;
            } catch (Exception ex) {
                failedCount++;
                log.error("Failed to send reminder id={} for userId={}", reminder.getId(), reminder.getUser().getId(), ex);
            }
        }

        log.info("Processed event reminders: sent={}, failed={}", sentCount, failedCount);
    }

    private void sendReminder(EventReminder reminder) {
        Event event = reminder.getEvent();
        User user = reminder.getUser();

        eventEmailService.sendEventReminder(
                user.getEmail(),
                user.getFirstName(),
                event.getTitle(),
                event.getId(),
                event.getLocation(),
                event.getStartDate(),
                toReminderLabel(reminder.getType())
        );
    }

    private String toReminderLabel(ReminderType type) {
        return switch (type) {
            case J2 -> "Starts in 2 days";
            case H24 -> "Starts in 24 hours";
            case H2 -> "Starts in 2 hours";
        };
    }
}
