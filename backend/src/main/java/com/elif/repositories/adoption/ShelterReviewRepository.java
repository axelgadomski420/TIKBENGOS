package com.elif.repositories.adoption;

import com.elif.entities.adoption.Shelter;
import com.elif.entities.adoption.ShelterReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface ShelterReviewRepository extends JpaRepository<ShelterReview, Long> {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    List<ShelterReview> findByShelterId(Long shelterId);

    List<ShelterReview> findByShelterIdAndIsApprovedTrue(Long shelterId);

    List<ShelterReview> findByUserId(Long userId);

    @Query("SELECT AVG(r.rating) FROM ShelterReview r WHERE r.shelter.id = :shelterId AND r.isApproved = true AND r.isDeleted = false")
    Double getAverageRatingByShelterId(@Param("shelterId") Long shelterId);

    @Query("SELECT COUNT(r) FROM ShelterReview r WHERE r.shelter.id = :shelterId AND r.isApproved = true AND r.isDeleted = false")
    Long getTotalReviewsByShelterId(@Param("shelterId") Long shelterId);

    boolean existsByShelterIdAndUserId(Long shelterId, Long userId);

    // ============================================================
    // MÉTHODES POUR CLASSEMENT ET NOTES
    // ============================================================

    /**
     * Trouver les refuges les mieux notés
     * @param limit Nombre maximum de refuges
     * @return Liste d'objets [shelterId, shelterName, averageRating, totalReviews]
     */
    @Query("SELECT r.shelter.id, r.shelter.name, AVG(r.rating), COUNT(r) " +
            "FROM ShelterReview r WHERE r.isApproved = true AND r.isDeleted = false " +
            "GROUP BY r.shelter.id, r.shelter.name " +
            "HAVING COUNT(r) >= 3 " +
            "ORDER BY AVG(r.rating) DESC")
    List<Object[]> findTopRatedShelters(@Param("limit") int limit);

    /**
     * Calculer la satisfaction globale d'un refuge (pourcentage d'avis 4 et 5 étoiles)
     * @param shelterId ID du refuge
     * @return Pourcentage de satisfaction (0-100)
     */
    @Query("SELECT (COUNT(CASE WHEN r.rating >= 4 THEN 1 END) * 100.0 / COUNT(r)) " +
            "FROM ShelterReview r WHERE r.shelter.id = :shelterId " +
            "AND r.isApproved = true AND r.isDeleted = false")
    Double calculateSatisfactionRate(@Param("shelterId") Long shelterId);

    /**
     * Calculer la note moyenne pondérée (plus de poids aux avis récents)
     * @param shelterId ID du refuge
     * @return Note moyenne pondérée
     */
    @Query("SELECT SUM(r.rating * (1 + (DATEDIFF(CURRENT_DATE, r.createdAt) / 365.0))) / SUM(1 + (DATEDIFF(CURRENT_DATE, r.createdAt) / 365.0)) " +
            "FROM ShelterReview r WHERE r.shelter.id = :shelterId " +
            "AND r.isApproved = true AND r.isDeleted = false")
    Double calculateWeightedAverageRating(@Param("shelterId") Long shelterId);

    // ============================================================
    // MÉTHODES POUR AVIS NÉGATIFS
    // ============================================================

    /**
     * Trouver les avis négatifs (1-2 étoiles) à traiter
     * @return Liste des avis négatifs
     */
    @Query("SELECT r FROM ShelterReview r WHERE r.rating <= 2 " +
            "AND r.isApproved = false AND r.isDeleted = false")
    List<ShelterReview> findNegativeReviews();

    /**
     * Trouver les avis négatifs d'un refuge spécifique
     * @param shelterId ID du refuge
     * @return Liste des avis négatifs du refuge
     */
    @Query("SELECT r FROM ShelterReview r WHERE r.shelter.id = :shelterId " +
            "AND r.rating <= 2 AND r.isApproved = true AND r.isDeleted = false")
    List<ShelterReview> findNegativeReviewsByShelterId(@Param("shelterId") Long shelterId);

    // ============================================================
    // MÉTHODES DE COMPTAGE PAR NOTE
    // ============================================================

    /**
     * Compter les avis par note pour un refuge
     * @param shelterId ID du refuge
     * @return Liste d'objets [rating, count]
     */
    @Query("SELECT r.rating, COUNT(r) FROM ShelterReview r " +
            "WHERE r.shelter.id = :shelterId AND r.isApproved = true AND r.isDeleted = false " +
            "GROUP BY r.rating ORDER BY r.rating")
    List<Object[]> countReviewsByRating(@Param("shelterId") Long shelterId);

    /**
     * Compter les avis positifs (4-5 étoiles) pour un refuge
     * @param shelterId ID du refuge
     * @return Nombre d'avis positifs
     */
    @Query("SELECT COUNT(r) FROM ShelterReview r WHERE r.shelter.id = :shelterId " +
            "AND r.rating >= 4 AND r.isApproved = true AND r.isDeleted = false")
    Long countPositiveReviews(@Param("shelterId") Long shelterId);

    /**
     * Compter les avis moyens (3 étoiles) pour un refuge
     * @param shelterId ID du refuge
     * @return Nombre d'avis moyens
     */
    @Query("SELECT COUNT(r) FROM ShelterReview r WHERE r.shelter.id = :shelterId " +
            "AND r.rating = 3 AND r.isApproved = true AND r.isDeleted = false")
    Long countAverageReviews(@Param("shelterId") Long shelterId);

    // ============================================================
    // MÉTHODES POUR AVIS RÉCENTS NON APPROUVÉS
    // ============================================================

    /**
     * Trouver les avis récents non approuvés
     * @param days Nombre de jours
     * @return Liste des avis non approuvés depuis X jours
     */
    @Query("SELECT r FROM ShelterReview r WHERE r.isApproved = false AND r.isDeleted = false " +
            "AND r.createdAt >= CURRENT_TIMESTAMP - :days DAY")
    List<ShelterReview> findRecentUnapprovedReviews(@Param("days") int days);

    // ============================================================
    // MÉTHODES AVEC DÉTAILS (FETCH JOIN)
    // ============================================================

    /**
     * Trouver les avis d'un refuge avec l'utilisateur
     * @param shelterId ID du refuge
     * @return Liste des avis avec l'utilisateur chargé
     */
    @Query("SELECT r FROM ShelterReview r JOIN FETCH r.user " +
            "WHERE r.shelter.id = :shelterId AND r.isApproved = true AND r.isDeleted = false " +
            "ORDER BY r.createdAt DESC")
    List<ShelterReview> findApprovedReviewsByShelterWithUser(@Param("shelterId") Long shelterId);

    /**
     * Trouver les avis récents avec détails utilisateur
     * @param limit Nombre maximum d'avis
     * @return Liste des avis avec utilisateur
     */
    @Query("SELECT r FROM ShelterReview r JOIN FETCH r.user JOIN FETCH r.shelter " +
            "WHERE r.isApproved = true AND r.isDeleted = false " +
            "ORDER BY r.createdAt DESC")
    List<ShelterReview> findRecentReviewsWithDetails(@Param("limit") int limit);

    // ============================================================
    // MÉTHODES POUR REFUGES SANS AVIS
    // ============================================================

    /**
     * Trouver les refuges sans avis
     * @return Liste des refuges sans aucun avis
     */
    @Query("SELECT s FROM Shelter s WHERE NOT EXISTS " +
            "(SELECT r FROM ShelterReview r WHERE r.shelter = s AND r.isApproved = true)")
    List<Shelter> findSheltersWithoutReviews();

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    /**
     * Trouver les avis d'un refuge avec une note spécifique
     * @param shelterId ID du refuge
     * @param rating Note recherchée
     * @return Liste des avis
     */
    List<ShelterReview> findByShelterIdAndRatingAndIsApprovedTrue(Long shelterId, Integer rating);

    /**
     * Supprimer tous les avis d'un refuge (soft delete)
     * @param shelterId ID du refuge
     */
    @Query("UPDATE ShelterReview r SET r.isDeleted = true WHERE r.shelter.id = :shelterId")
    void softDeleteByShelterId(@Param("shelterId") Long shelterId);

    /**
     * Compter le nombre d'avis en attente d'approbation
     * @return Nombre d'avis en attente
     */
    long countByIsApprovedFalseAndIsDeletedFalse();

    /**
     * Compter le nombre d'avis par jour pour un refuge
     * @param shelterId ID du refuge
     * @param days Nombre de jours
     * @return Liste d'objets [date, count]
     */
    @Query("SELECT DATE(r.createdAt), COUNT(r) FROM ShelterReview r " +
            "WHERE r.shelter.id = :shelterId AND r.createdAt >= CURRENT_TIMESTAMP - :days DAY " +
            "AND r.isApproved = true AND r.isDeleted = false " +
            "GROUP BY DATE(r.createdAt) ORDER BY DATE(r.createdAt) DESC")
    List<Object[]> countReviewsByDayForShelter(@Param("shelterId") Long shelterId, @Param("days") int days);

    /**
     * Trouver les avis d'un utilisateur avec détails du refuge
     * @param userId ID de l'utilisateur
     * @return Liste des avis avec refuge
     */
    @Query("SELECT r FROM ShelterReview r JOIN FETCH r.shelter WHERE r.user.id = :userId")
    List<ShelterReview> findReviewsByUserWithShelter(@Param("userId") Long userId);

    /**
     * Compter le nombre total d'avis approuvés
     * @return Nombre total d'avis
     */
    @Query("SELECT COUNT(r) FROM ShelterReview r WHERE r.isApproved = true AND r.isDeleted = false")
    long countTotalApprovedReviews();

    /**
     * Compter le nombre d'avis par mois
     * @return Liste d'objets [year, month, count]
     */
    @Query("SELECT YEAR(r.createdAt), MONTH(r.createdAt), COUNT(r) FROM ShelterReview r " +
            "WHERE r.isApproved = true AND r.isDeleted = false " +
            "GROUP BY YEAR(r.createdAt), MONTH(r.createdAt) " +
            "ORDER BY YEAR(r.createdAt) DESC, MONTH(r.createdAt) DESC")
    List<Object[]> countReviewsByMonth();

    /**
     * Trouver les avis en attente de modération
     */
    List<ShelterReview> findByIsApprovedFalseAndIsDeletedFalse();

    @Query("SELECT COUNT(r) FROM ShelterReview r WHERE r.isApproved = false AND r.isDeleted = false")
    long countPendingReviews();

    @Query("SELECT COUNT(r) FROM ShelterReview r WHERE r.isApproved = true AND r.isDeleted = false")
    long countApprovedReviews();

    @Query("SELECT COUNT(r) FROM ShelterReview r WHERE r.isDeleted = false")
    long countTotalReviews();
}