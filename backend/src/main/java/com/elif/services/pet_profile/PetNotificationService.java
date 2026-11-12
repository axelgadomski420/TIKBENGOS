package com.elif.services.pet_profile;

import com.elif.entities.notification.enums.NotificationType;
import com.elif.entities.pet_profile.PetCareTask;
import com.elif.entities.pet_profile.PetHealthRecord;
import com.elif.entities.pet_profile.PetProfile;
import com.elif.entities.pet_profile.enums.PetTaskStatus;
import com.elif.repositories.pet_profile.PetCareTaskRepository;
import com.elif.repositories.pet_profile.PetHealthRecordRepository;
import com.elif.repositories.pet_profile.PetProfileRepository;
import com.elif.services.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Pet notification service - sends reminders for vaccines, health checkups, care tasks, etc.
 * Runs periodic checks to identify upcoming pet health events and create notifications.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class PetNotificationService {

    private final PetProfileRepository petProfileRepository;
    private final PetHealthRecordRepository petHealthRecordRepository;
    private final PetCareTaskRepository petCareTaskRepository;
    private final AppNotificationService appNotificationService;
    private final PetReminderEmailService petReminderEmailService;

    /**
     * Daily scheduled task: Check for upcoming pet health reminders
     * Runs at 08:00 each morning
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void checkDailyReminders() {
        log.info("🐾 Starting daily pet health reminder check");
        
        List<PetProfile> allPets = petProfileRepository.findAll();
        for (PetProfile pet : allPets) {
            if (pet.getUser() == null) {
                continue;
            }
            
            Long userId = pet.getUser().getId();
            
            // Check for vaccine reminders
            checkVaccineReminder(pet, userId);
            
            // Check for next visit reminders
            checkNextVisitReminder(pet, userId);
            
            // Check for parasite prevention reminders
            checkParasitePreventionReminder(pet, userId);
            
            // Check for upcoming care tasks
            checkUpcomingCareTasks(pet, userId);
        }
        
        log.info("✅ Daily pet health reminder check completed");
    }

    /**
     * Check if vaccine reminder should be sent
     * Sends reminder if next visit is within 14 days
     */
    private void checkVaccineReminder(PetProfile pet, Long userId) {
        PetHealthRecord latestRecord = petHealthRecordRepository
                .findByPetIdOrderByRecordDateDesc(pet.getId())
                .stream()
                .findFirst()
                .orElse(null);
        
        if (latestRecord == null || latestRecord.getNextVisitDate() == null) {
            return;
        }
        
        LocalDate nextVisit = latestRecord.getNextVisitDate();
        long daysUntilVisit = ChronoUnit.DAYS.between(LocalDate.now(), nextVisit);
        
        // Send reminder if visit is within 14 days but not today
        if (daysUntilVisit > 0 && daysUntilVisit <= 14) {
            String title = "Vaccine Reminder: " + pet.getName();
            String message = String.format(
                "Time for %s's vaccination appointment. Next visit scheduled for %s.",
                pet.getName(),
                nextVisit
            );
            
            appNotificationService.create(
                userId,
                null,
                NotificationType.PET_VACCINE_REMINDER,
                title,
                message,
                "/app/pets/" + pet.getId(),
                "PET_HEALTH_RECORD",
                latestRecord.getId()
            );
            petReminderEmailService.sendVaccineReminder(pet, latestRecord);
            
            log.info("💉 Vaccine reminder sent for pet {}: {}", pet.getName(), title);
        }
    }

    /**
     * Check if health checkup reminder should be sent
     * Sends reminder if no health record in last 6 months
     */
    private void checkNextVisitReminder(PetProfile pet, Long userId) {
        PetHealthRecord latestRecord = petHealthRecordRepository
                .findByPetIdOrderByRecordDateDesc(pet.getId())
                .stream()
                .findFirst()
                .orElse(null);
        
        if (latestRecord == null) {
            // No health record at all - send reminder to create first record
            appNotificationService.create(
                userId,
                null,
                NotificationType.PET_HEALTH_CHECKUP_REMINDER,
                "Health Checkup Needed: " + pet.getName(),
                "No health record found for " + pet.getName() + ". Schedule a veterinary checkup.",
                "/app/pets/" + pet.getId(),
                "PET_PROFILE",
                pet.getId()
            );
            petReminderEmailService.sendHealthCheckupReminder(pet, null);
            
            log.info("🏥 Health checkup reminder sent for pet {} (no record)", pet.getName());
            return;
        }
        
        // Check if last visit was more than 6 months ago
        long monthsSinceVisit = ChronoUnit.MONTHS.between(latestRecord.getRecordDate(), LocalDate.now());
        
        if (monthsSinceVisit >= 6) {
            appNotificationService.create(
                userId,
                null,
                NotificationType.PET_HEALTH_CHECKUP_REMINDER,
                "Health Checkup Due: " + pet.getName(),
                String.format(
                    "%s hasn't had a checkup in %d months. Schedule an appointment.",
                    pet.getName(),
                    monthsSinceVisit
                ),
                "/app/pets/" + pet.getId(),
                "PET_HEALTH_RECORD",
                latestRecord.getId()
            );
            petReminderEmailService.sendHealthCheckupReminder(pet, latestRecord);
            
            log.info("🏥 Health checkup reminder sent for pet {}: overdue", pet.getName());
        }
    }

    /**
     * Check if parasite prevention reminder should be sent
     * Sends reminder based on common prevention schedules (every 3 months typical)
     */
    private void checkParasitePreventionReminder(PetProfile pet, Long userId) {
        PetHealthRecord latestRecord = petHealthRecordRepository
                .findByPetIdOrderByRecordDateDesc(pet.getId())
                .stream()
                .findFirst()
                .orElse(null);
        
        if (latestRecord == null || latestRecord.getParasitePrevention() == null) {
            return;
        }
        
        // Assuming prevention was done on record date; typically needed every 3 months
        LocalDate nextPreventionDate = latestRecord.getRecordDate().plusMonths(3);
        long daysUntilDue = ChronoUnit.DAYS.between(LocalDate.now(), nextPreventionDate);
        
        // Send reminder if due within 30 days
        if (daysUntilDue > 0 && daysUntilDue <= 30) {
            appNotificationService.create(
                userId,
                null,
                NotificationType.PET_PARASITE_PREVENTION_REMINDER,
                "Parasite Prevention Due: " + pet.getName(),
                String.format(
                    "%s needs parasite prevention. Last treatment was on %s.",
                    pet.getName(),
                    latestRecord.getRecordDate()
                ),
                "/app/pets/" + pet.getId(),
                "PET_HEALTH_RECORD",
                latestRecord.getId()
            );
            petReminderEmailService.sendParasitePreventionReminder(pet, latestRecord, nextPreventionDate);
            
            log.info("🐛 Parasite prevention reminder sent for pet {}", pet.getName());
        }
    }

    /**
     * Check for upcoming care tasks and send reminders
     * Sends reminder for tasks due within 3 days
     */
    private void checkUpcomingCareTasks(PetProfile pet, Long userId) {
        List<PetCareTask> upcomingTasks = petCareTaskRepository.findByPetIdAndStatusNotAndDueDateNotNull(
            pet.getId(),
            PetTaskStatus.DONE
        );
        
        LocalDate today = LocalDate.now();
        LocalDate threeDaysFromNow = today.plusDays(3);
        
        for (PetCareTask task : upcomingTasks) {
            if (task.getDueDate() == null) {
                continue;
            }
            
            // Send reminder if due within 3 days and not already done
            if (!task.getDueDate().isBefore(today) && !task.getDueDate().isAfter(threeDaysFromNow)) {
                long daysUntilDue = ChronoUnit.DAYS.between(today, task.getDueDate());
                
                String title = "Care Task Reminder: " + task.getTitle();
                String message = String.format(
                    "%s for %s is due in %d day%s. (%s priority)",
                    task.getTitle(),
                    pet.getName(),
                    daysUntilDue,
                    daysUntilDue == 1 ? "" : "s",
                    task.getUrgency()
                );
                
                appNotificationService.create(
                    userId,
                    null,
                    NotificationType.PET_CARE_TASK_REMINDER,
                    title,
                    message,
                    "/app/pets/" + pet.getId(),
                    "PET_CARE_TASK",
                    task.getId()
                );
                petReminderEmailService.sendCareTaskReminder(pet, task, daysUntilDue);
                
                log.info("✓ Care task reminder sent for pet {}: {}", pet.getName(), task.getTitle());
            }
        }
    }

    /**
     * Send immediate notification when health record is created with next visit date
     */
    public void notifyNewHealthRecord(Long userId, PetHealthRecord record) {
        PetProfile pet = record.getPet();
        
        if (record.getVaccinationHistory() != null && !record.getVaccinationHistory().isBlank()) {
            appNotificationService.create(
                userId,
                null,
                NotificationType.PET_HEALTH_UPDATE,
                "Health Record Saved: " + pet.getName(),
                "Vaccination history and checkup details have been saved.",
                "/app/pets/" + pet.getId(),
                "PET_HEALTH_RECORD",
                record.getId()
            );
            petReminderEmailService.sendHealthUpdate(pet, record);
        }
    }

    /**
     * Send notification when urgent care task is created
     */
    public void notifyUrgentCareTask(Long userId, PetCareTask task) {
        PetProfile pet = task.getPet();
        
        if ("CRITICAL".equals(task.getUrgency().toString()) || "HIGH".equals(task.getUrgency().toString())) {
            appNotificationService.create(
                userId,
                null,
                NotificationType.PET_CARE_TASK_REMINDER,
                "Urgent: " + task.getTitle(),
                String.format(
                    "Urgent care task created for %s: %s",
                    pet.getName(),
                    task.getTitle()
                ),
                "/app/pets/" + pet.getId(),
                "PET_CARE_TASK",
                task.getId()
            );
            petReminderEmailService.sendCareTaskReminder(pet, task, 0);
        }
    }
}
