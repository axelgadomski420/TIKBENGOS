package com.elif.repositories.adoption;

import com.elif.entities.adoption.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    // Tous les RDV d'un shelter
    List<Appointment> findByShelterIdOrderByAppointmentDateAsc(Long shelterId);

    // Tous les RDV d'un adoptant
    List<Appointment> findByAdopterIdOrderByAppointmentDateAsc(Long adopterId);

    // RDV pour une demande spécifique
    List<Appointment> findByRequestId(Long requestId);

    // RDV pour un animal spécifique
    List<Appointment> findByPetIdOrderByAppointmentDateAsc(Long petId);

    // RDV planifiés d'un shelter (pas encore passés)
    @Query("SELECT a FROM Appointment a WHERE a.shelter.id = :shelterId " +
            "AND a.status = 'SCHEDULED' AND a.appointmentDate >= :now " +
            "ORDER BY a.appointmentDate ASC")
    List<Appointment> findUpcomingByShelter(@Param("shelterId") Long shelterId,
                                            @Param("now") LocalDateTime now);

    // Vérifier conflit de créneau pour un animal
    @Query("SELECT a FROM Appointment a WHERE a.pet.id = :petId " +
            "AND a.status = 'SCHEDULED' " +
            "AND a.appointmentDate BETWEEN :start AND :end")
    List<Appointment> findConflictingAppointments(@Param("petId") Long petId,
                                                  @Param("start") LocalDateTime start,
                                                  @Param("end") LocalDateTime end);

    // RDV d'un adoptant par statut
    List<Appointment> findByAdopterIdAndStatus(Long adopterId, String status);
}