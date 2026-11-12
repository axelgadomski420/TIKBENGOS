package com.elif.repositories.adoption;

import com.elif.entities.adoption.AdoptionRequest;
import com.elif.entities.adoption.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdoptionRequestRepository extends JpaRepository<AdoptionRequest, Long> {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    List<AdoptionRequest> findByPetId(Long petId);

    List<AdoptionRequest> findByAdopterId(Long adopterId);

    List<AdoptionRequest> findByStatus(RequestStatus status);

    List<AdoptionRequest> findByPetIdAndStatus(Long petId, RequestStatus status);

    // ✅ NOUVELLE MÉTHODE : trouver les demandes par animal et plusieurs statuts
    List<AdoptionRequest> findByPetIdAndStatusIn(Long petId, List<RequestStatus> statuses);

    @Query("SELECT r FROM AdoptionRequest r WHERE r.pet.shelter.id = :shelterId")
    List<AdoptionRequest> findByShelterId(@Param("shelterId") Long shelterId);

    @Modifying
    @Query("UPDATE AdoptionRequest r SET r.status = :status WHERE r.id = :requestId")
    void updateStatus(@Param("requestId") Long requestId, @Param("status") RequestStatus status);

    boolean existsByPetIdAndAdopterIdAndStatusIn(Long petId, Long adopterId, List<RequestStatus> statuses);

    // ============================================================
    // MÉTHODES DE COMPTAGE ET STATISTIQUES
    // ============================================================

    /**
     * Compter les demandes en cours par refuge
     * @param shelterId ID du refuge
     * @return Nombre de demandes en attente et en cours d'examen
     */
    @Query("SELECT COUNT(r) FROM AdoptionRequest r WHERE r.pet.shelter.id = :shelterId " +
            "AND r.status IN :statuses")
    Long countPendingRequestsByShelterId(@Param("shelterId") Long shelterId,
                                         @Param("statuses") List<RequestStatus> statuses);

    /**
     * Trouver les utilisateurs qui ont le plus de demandes
     * @param limit Nombre maximum d'utilisateurs
     * @return Liste d'objets [userId, userFullName, count]
     */
    @Query("SELECT r.adopter.id, CONCAT(r.adopter.firstName, ' ', r.adopter.lastName), COUNT(r) " +
            "FROM AdoptionRequest r GROUP BY r.adopter.id ORDER BY COUNT(r) DESC")
    List<Object[]> findTopAdopters();

    /**
     * Trouver les animaux les plus demandés
     * @param limit Nombre maximum d'animaux
     * @return Liste d'objets [petId, petName, requestCount]
     */
    @Query("SELECT r.pet.id, r.pet.name, COUNT(r) FROM AdoptionRequest r " +
            "GROUP BY r.pet.id ORDER BY COUNT(r) DESC")
    List<Object[]> findMostRequestedPets();

    /**
     * Compter les demandes par statut pour un refuge
     * @param shelterId ID du refuge
     * @return Liste d'objets [status, count]
     */
    @Query("SELECT r.status, COUNT(r) FROM AdoptionRequest r " +
            "WHERE r.pet.shelter.id = :shelterId GROUP BY r.status")
    List<Object[]> countRequestsByStatusForShelter(@Param("shelterId") Long shelterId);

    // ============================================================
    // MÉTHODES DE RECHERCHE PAR TEMPS
    // ============================================================

    /**
     * Trouver les demandes en attente depuis plus de X jours
     * @param days Nombre de jours
     * @param status Statut à vérifier
     * @return Liste des demandes en attente depuis plus de X jours
     */
    @Query(value = "SELECT r FROM AdoptionRequest r WHERE r.status = :status " +
            "AND r.createdAt <= CURRENT_TIMESTAMP - :days DAY")
    List<AdoptionRequest> findPendingRequestsOlderThan(@Param("days") int days,
                                                       @Param("status") RequestStatus status);

    /**
     * Compter le nombre de demandes par jour (pour statistiques)
     * @param days Nombre de jours
     * @return Liste d'objets [date, count]
     */
    @Query("SELECT FUNCTION('DATE', r.createdAt), COUNT(r) FROM AdoptionRequest r " +
            "WHERE r.createdAt >= CURRENT_TIMESTAMP - :days DAY " +
            "GROUP BY FUNCTION('DATE', r.createdAt) ORDER BY FUNCTION('DATE', r.createdAt) DESC")
    List<Object[]> countRequestsByDay(@Param("days") int days);

    /**
     * Compter les demandes approuvées par mois (pour dashboard)
     * @return Liste d'objets [year, month, count]
     */
    @Query("SELECT YEAR(r.approvedDate), MONTH(r.approvedDate), COUNT(r) " +
            "FROM AdoptionRequest r WHERE r.status = 'APPROVED' AND r.approvedDate IS NOT NULL " +
            "GROUP BY YEAR(r.approvedDate), MONTH(r.approvedDate) " +
            "ORDER BY YEAR(r.approvedDate) DESC, MONTH(r.approvedDate) DESC")
    List<Object[]> countApprovedRequestsByMonth();

    // ============================================================
    // MÉTHODES AVEC DÉTAILS (FETCH JOIN)
    // ============================================================

    /**
     * Trouver les demandes d'un adoptant avec détails de l'animal
     * @param userId ID de l'utilisateur (adoptant)
     * @return Liste des demandes avec l'animal chargé
     */
    @Query("SELECT r FROM AdoptionRequest r JOIN FETCH r.pet WHERE r.adopter.id = :userId ORDER BY r.createdAt DESC")
    List<AdoptionRequest> findRequestsByAdopterWithPet(@Param("userId") Long userId);

    /**
     * Trouver les demandes d'un refuge avec détails
     * @param shelterId ID du refuge
     * @return Liste des demandes avec l'animal chargé
     */
    @Query("SELECT r FROM AdoptionRequest r JOIN FETCH r.pet WHERE r.pet.shelter.id = :shelterId")
    List<AdoptionRequest> findRequestsByShelterWithPet(@Param("shelterId") Long shelterId);

    // ============================================================
    // MÉTHODES POUR DEMANDES REJETÉES
    // ============================================================

    /**
     * Trouver les demandes rejetées avec motif
     * @param status Statut REJECTED
     * @return Liste des demandes rejetées qui ont un motif
     */
    @Query("SELECT r FROM AdoptionRequest r WHERE r.status = :status " +
            "AND r.rejectionReason IS NOT NULL AND r.rejectionReason != ''")
    List<AdoptionRequest> findRejectedRequestsWithReason(@Param("status") RequestStatus status);

    // ============================================================
    // MÉTHODES DE VÉRIFICATION
    // ============================================================

    /**
     * Vérifier si un utilisateur a déjà eu une demande approuvée
     * @param userId ID de l'utilisateur
     * @param status Statut APPROVED
     * @return true si l'utilisateur a au moins une demande approuvée
     */
    boolean existsByAdopterIdAndStatus(Long userId, RequestStatus status);

    /**
     * Vérifier si un animal a des demandes en attente
     * @param petId ID de l'animal
     * @param status Statut PENDING
     * @return true si l'animal a des demandes en attente
     */
    boolean existsByPetIdAndStatus(Long petId, RequestStatus status);

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    /**
     * Trouver les demandes par date (période)
     * @param startDate Date de début
     * @param endDate Date de fin
     * @return Liste des demandes entre deux dates
     */
    List<AdoptionRequest> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Compter le nombre de demandes par refuge (pour classement)
     * @return Liste d'objets [shelterId, shelterName, requestCount]
     */
    @Query("SELECT r.pet.shelter.id, r.pet.shelter.name, COUNT(r) FROM AdoptionRequest r " +
            "GROUP BY r.pet.shelter.id ORDER BY COUNT(r) DESC")
    List<Object[]> countRequestsByShelter();

    /**
     * Compter les demandes approuvées pour un refuge
     * @param shelterId ID du refuge
     * @return Nombre de demandes approuvées
     */
    @Query("SELECT COUNT(r) FROM AdoptionRequest r WHERE r.pet.shelter.id = :shelterId AND r.status = 'APPROVED'")
    Long countApprovedRequestsByShelterId(@Param("shelterId") Long shelterId);

    /**
     * Compter les demandes rejetées pour un refuge
     * @param shelterId ID du refuge
     * @return Nombre de demandes rejetées
     */
    @Query("SELECT COUNT(r) FROM AdoptionRequest r WHERE r.pet.shelter.id = :shelterId AND r.status = 'REJECTED'")
    Long countRejectedRequestsByShelterId(@Param("shelterId") Long shelterId);

    /**
     * Trouver les demandes approuvées d'une période donnée
     * @param startDate Date de début
     * @param endDate Date de fin
     * @return Liste des demandes approuvées
     */
    @Query("SELECT r FROM AdoptionRequest r WHERE r.status = 'APPROVED' " +
            "AND r.approvedDate BETWEEN :startDate AND :endDate")
    List<AdoptionRequest> findApprovedRequestsBetween(@Param("startDate") LocalDateTime startDate,
                                                      @Param("endDate") LocalDateTime endDate);

    /**
     * Compter le nombre de demandes par statut
     * @param status Statut
     * @return Nombre de demandes
     */
    long countByStatus(RequestStatus status);
}