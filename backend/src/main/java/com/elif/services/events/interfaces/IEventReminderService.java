package com.elif.services.events.interfaces;

import com.elif.entities.events.Event;
import com.elif.entities.user.User;

public interface IEventReminderService {

    /** Programmer les rappels (J-2, H-24, H-2) pour un participant */
    void scheduleReminders(Event event, User user);

    /** Annuler les rappels d'un participant sur un événement */
    void cancelReminders(Long eventId, Long userId);

    /** Annuler tous les rappels d'un événement (annulation/suppression) */
    void cancelAllRemindersForEvent(Long eventId);

    /** Tâche planifiée : envoyer les rappels échus */
    void sendPendingReminders();
}
