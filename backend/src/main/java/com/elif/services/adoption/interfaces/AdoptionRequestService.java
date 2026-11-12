package com.elif.services.adoption.interfaces;

import com.elif.entities.adoption.AdoptionRequest;
import com.elif.entities.adoption.enums.RequestStatus;

import java.time.LocalDateTime;
import java.util.List;

public interface AdoptionRequestService {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    List<AdoptionRequest> findAll();

    AdoptionRequest findById(Long id);

    List<AdoptionRequest> findByPetId(Long petId);

    List<AdoptionRequest> findByAdopterId(Long adopterId);

    List<AdoptionRequest> findByShelterId(Long shelterId);

    List<AdoptionRequest> findByStatus(RequestStatus status);

    AdoptionRequest create(Long petId, Long userId, String notes,
                           String housingType, Boolean hasGarden,
                           Boolean hasChildren, String otherPets,
                           String experienceLevel);

    AdoptionRequest update(Long requestId, String notes);

    AdoptionRequest approve(Long requestId);

    AdoptionRequest reject(Long requestId, String reason);

    AdoptionRequest underReview(Long requestId);

    AdoptionRequest cancel(Long requestId, Long userId);

    boolean hasActiveRequest(Long petId, Long userId);

    // ============================================================
    // MÉTHODES DE COMPTAGE ET STATISTIQUES
    // ============================================================

    Long countPendingRequestsByShelterId(Long shelterId);

    List<Object[]> findTopAdopters(int limit);

    List<Object[]> findMostRequestedPets(int limit);

    List<Object[]> countRequestsByStatusForShelter(Long shelterId);

    List<AdoptionRequest> findPendingRequestsOlderThan(int days);

    List<Object[]> countRequestsByDay(int days);

    List<Object[]> countApprovedRequestsByMonth();

    // ============================================================
    // MÉTHODES AVEC DÉTAILS (FETCH JOIN)
    // ============================================================

    List<AdoptionRequest> findRequestsByAdopterWithPet(Long userId);

    List<AdoptionRequest> findRequestsByShelterWithPet(Long shelterId);

    // ============================================================
    // MÉTHODES POUR DEMANDES REJETÉES
    // ============================================================

    List<AdoptionRequest> findRejectedRequestsWithReason();

    // ============================================================
    // MÉTHODES DE VÉRIFICATION
    // ============================================================

    boolean hasApprovedRequest(Long userId);

    boolean hasPendingRequestsForPet(Long petId);

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    List<AdoptionRequest> findByDateBetween(LocalDateTime startDate, LocalDateTime endDate);

    List<Object[]> countRequestsByShelter();

    Long countApprovedRequestsByShelterId(Long shelterId);

    Long countRejectedRequestsByShelterId(Long shelterId);

    List<AdoptionRequest> findApprovedRequestsBetween(LocalDateTime startDate, LocalDateTime endDate);

    // ============================================================
    // ✅ NOUVELLES MÉTHODES POUR LA GESTION DES DEMANDES ACTIVES
    // ============================================================

    /**
     * Trouver les demandes actives (PENDING ou UNDER_REVIEW) pour un animal
     * @param petId ID de l'animal
     * @return Liste des demandes actives
     */
    List<AdoptionRequest> findActiveRequestsByPet(Long petId);
}