package com.elif.services.adoption.interfaces;

import com.elif.entities.adoption.Shelter;
import com.elif.entities.adoption.ShelterReview;

import java.util.List;

public interface ShelterReviewService {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    // AJOUTER CETTE MÉTHODE
    ShelterReview findById(Long id);

    List<ShelterReview> findByShelterId(Long shelterId);

    List<ShelterReview> findApprovedByShelterId(Long shelterId);

    List<ShelterReview> findByUserId(Long userId);

    ShelterReview create(Long shelterId, Long userId, Integer rating, String comment);

    ShelterReview approveReview(Long reviewId);

    void rejectReview(Long reviewId);

    void deleteReview(Long reviewId, Long userId);

    Double getAverageRating(Long shelterId);

    Long getTotalReviews(Long shelterId);

    // ============================================================
    // MÉTHODES POUR CLASSEMENT ET NOTES
    // ============================================================

    List<Object[]> findTopRatedShelters(int limit);

    Double calculateSatisfactionRate(Long shelterId);

    Double calculateWeightedAverageRating(Long shelterId);

    // ============================================================
    // MÉTHODES POUR AVIS NÉGATIFS
    // ============================================================

    List<ShelterReview> findNegativeReviews();

    List<ShelterReview> findNegativeReviewsByShelterId(Long shelterId);

    // ============================================================
    // MÉTHODES DE COMPTAGE PAR NOTE
    // ============================================================

    List<Object[]> countReviewsByRating(Long shelterId);

    Long countPositiveReviews(Long shelterId);

    Long countAverageReviews(Long shelterId);

    // ============================================================
    // MÉTHODES POUR AVIS RÉCENTS NON APPROUVÉS
    // ============================================================

    List<ShelterReview> findRecentUnapprovedReviews(int days);

    // ============================================================
    // MÉTHODES AVEC DÉTAILS (FETCH JOIN)
    // ============================================================

    List<ShelterReview> findApprovedReviewsByShelterWithUser(Long shelterId);

    List<ShelterReview> findRecentReviewsWithDetails(int limit);

    // ============================================================
    // MÉTHODES POUR REFUGES SANS AVIS
    // ============================================================

    List<Shelter> findSheltersWithoutReviews();

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    List<ShelterReview> findByShelterIdAndRating(Long shelterId, Integer rating);

    void softDeleteByShelterId(Long shelterId);

    long countPendingApproval();

    List<Object[]> countReviewsByDayForShelter(Long shelterId, int days);

    List<ShelterReview> findReviewsByUserWithShelter(Long userId);

    long countTotalApprovedReviews();

    List<Object[]> countReviewsByMonth();
}