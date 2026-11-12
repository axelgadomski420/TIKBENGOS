package com.elif.services.adoption.interfaces;

import com.elif.entities.adoption.Appointment;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Interface pour la gestion des rendez-vous d'adoption
 */
public interface IAppointmentService {

    /**
     * Planifier un rendez-vous pour une demande d'adoption
     * @param requestId ID de la demande d'adoption
     * @param appointmentDate Date et heure du rendez-vous
     * @param shelterNotes Notes du shelter pour le rendez-vous
     * @param compatibilityScore Score de compatibilité du demandeur
     * @return Rendez-vous créé
     */
    Appointment scheduleAppointment(Long requestId, LocalDateTime appointmentDate,
                                    String shelterNotes, Integer compatibilityScore);

    /**
     * Répondre après la consultation sur place
     * @param appointmentId ID du rendez-vous
     * @param result Résultat de la consultation (APPROVED ou REJECTED)
     * @param responseMessage Message de réponse au demandeur
     * @return Rendez-vous mis à jour
     */
    Appointment respondAfterConsultation(Long appointmentId, String result, String responseMessage);

    /**
     * Annuler un rendez-vous
     * @param appointmentId ID du rendez-vous
     * @param raison Raison de l'annulation
     * @return Rendez-vous annulé
     */
    Appointment cancelAppointment(Long appointmentId, String raison);

    /**
     * Récupérer tous les rendez-vous d'un shelter
     * @param shelterId ID du shelter
     * @return Liste des rendez-vous
     */
    List<Appointment> getByShelter(Long shelterId);

    /**
     * Récupérer les rendez-vous à venir d'un shelter
     * @param shelterId ID du shelter
     * @return Liste des rendez-vous à venir
     */
    List<Appointment> getUpcomingByShelter(Long shelterId);

    /**
     * Récupérer tous les rendez-vous d'un adoptant
     * @param adopterId ID de l'adoptant
     * @return Liste des rendez-vous
     */
    List<Appointment> getByAdopter(Long adopterId);

    /**
     * Récupérer les rendez-vous d'une demande spécifique
     * @param requestId ID de la demande
     * @return Liste des rendez-vous
     */
    List<Appointment> getByRequest(Long requestId);

    /**
     * Récupérer un rendez-vous par son ID
     * @param id ID du rendez-vous
     * @return Rendez-vous
     */
    Appointment getById(Long id);
}