package com.elif.services.adoption.impl;

import com.elif.entities.adoption.Shelter;
import com.elif.entities.adoption.ShelterReview;
import com.elif.entities.user.User;
import com.elif.repositories.adoption.ShelterReviewRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.services.adoption.interfaces.ShelterReviewService;
import com.elif.services.adoption.interfaces.ShelterService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ShelterReviewServiceImpl implements ShelterReviewService {

    private final ShelterReviewRepository reviewRepository;
    private final ShelterService shelterService;
    private final UserRepository userRepository;

    // ============================================================
    // CONSTRUCTEUR
    // ============================================================

    public ShelterReviewServiceImpl(ShelterReviewRepository reviewRepository,
                                    ShelterService shelterService,
                                    UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.shelterService = shelterService;
        this.userRepository = userRepository;
    }

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    @Override
    public ShelterReview findById(Long id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Avis non trouvé avec l'id: " + id));
    }

    @Override
    public List<ShelterReview> findByShelterId(Long shelterId) {
        return reviewRepository.findByShelterId(shelterId);
    }

    @Override
    public List<ShelterReview> findApprovedByShelterId(Long shelterId) {
        return reviewRepository.findByShelterIdAndIsApprovedTrue(shelterId);
    }

    @Override
    public List<ShelterReview> findByUserId(Long userId) {
        return reviewRepository.findByUserId(userId);
    }

    @Override
    public ShelterReview create(Long shelterId, Long userId, Integer rating, String comment) {
        Shelter shelter = shelterService.findById(shelterId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (reviewRepository.existsByShelterIdAndUserId(shelterId, userId)) {
            throw new RuntimeException("Vous avez déjà laissé un avis pour ce refuge");
        }

        ShelterReview review = ShelterReview.builder()
                .shelter(shelter)
                .user(user)
                .rating(rating)
                .comment(comment)
                .isApproved(false)
                .isDeleted(false)
                .build();

        return reviewRepository.save(review);
    }

    @Override
    public ShelterReview approveReview(Long reviewId) {
        ShelterReview review = findById(reviewId);
        review.setIsApproved(true);
        return reviewRepository.save(review);
    }

    @Override
    public void rejectReview(Long reviewId) {
        ShelterReview review = findById(reviewId);
        reviewRepository.delete(review);
    }

    @Override
    public void deleteReview(Long reviewId, Long userId) {
        ShelterReview review = findById(reviewId);

        if (!review.getUser().getId().equals(userId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à supprimer cet avis");
        }

        review.setIsDeleted(true);
        reviewRepository.save(review);
    }

    @Override
    public Double getAverageRating(Long shelterId) {
        Double average = reviewRepository.getAverageRatingByShelterId(shelterId);
        return average != null ? average : 0.0;
    }

    @Override
    public Long getTotalReviews(Long shelterId) {
        Long total = reviewRepository.getTotalReviewsByShelterId(shelterId);
        return total != null ? total : 0L;
    }

    // ============================================================
    // MÉTHODES POUR CLASSEMENT ET NOTES
    // ============================================================

    @Override
    public List<Object[]> findTopRatedShelters(int limit) {
        return reviewRepository.findTopRatedShelters(limit);
    }

    @Override
    public Double calculateSatisfactionRate(Long shelterId) {
        Double rate = reviewRepository.calculateSatisfactionRate(shelterId);
        return rate != null ? rate : 0.0;
    }

    @Override
    public Double calculateWeightedAverageRating(Long shelterId) {
        Double average = reviewRepository.calculateWeightedAverageRating(shelterId);
        return average != null ? average : 0.0;
    }

    // ============================================================
    // MÉTHODES POUR AVIS NÉGATIFS
    // ============================================================

    @Override
    public List<ShelterReview> findNegativeReviews() {
        return reviewRepository.findNegativeReviews();
    }

    @Override
    public List<ShelterReview> findNegativeReviewsByShelterId(Long shelterId) {
        return reviewRepository.findNegativeReviewsByShelterId(shelterId);
    }

    // ============================================================
    // MÉTHODES DE COMPTAGE PAR NOTE
    // ============================================================

    @Override
    public List<Object[]> countReviewsByRating(Long shelterId) {
        return reviewRepository.countReviewsByRating(shelterId);
    }

    @Override
    public Long countPositiveReviews(Long shelterId) {
        return reviewRepository.countPositiveReviews(shelterId);
    }

    @Override
    public Long countAverageReviews(Long shelterId) {
        return reviewRepository.countAverageReviews(shelterId);
    }

    // ============================================================
    // MÉTHODES POUR AVIS RÉCENTS NON APPROUVÉS
    // ============================================================

    @Override
    public List<ShelterReview> findRecentUnapprovedReviews(int days) {
        return reviewRepository.findRecentUnapprovedReviews(days);
    }

    // ============================================================
    // MÉTHODES AVEC DÉTAILS (FETCH JOIN)
    // ============================================================

    @Override
    public List<ShelterReview> findApprovedReviewsByShelterWithUser(Long shelterId) {
        return reviewRepository.findApprovedReviewsByShelterWithUser(shelterId);
    }

    @Override
    public List<ShelterReview> findRecentReviewsWithDetails(int limit) {
        return reviewRepository.findRecentReviewsWithDetails(limit);
    }

    // ============================================================
    // MÉTHODES POUR REFUGES SANS AVIS
    // ============================================================

    @Override
    public List<Shelter> findSheltersWithoutReviews() {
        return reviewRepository.findSheltersWithoutReviews();
    }

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    @Override
    public List<ShelterReview> findByShelterIdAndRating(Long shelterId, Integer rating) {
        return reviewRepository.findByShelterIdAndRatingAndIsApprovedTrue(shelterId, rating);
    }

    @Override
    public void softDeleteByShelterId(Long shelterId) {
        reviewRepository.softDeleteByShelterId(shelterId);
    }

    @Override
    public long countPendingApproval() {
        return reviewRepository.countByIsApprovedFalseAndIsDeletedFalse();
    }

    @Override
    public List<Object[]> countReviewsByDayForShelter(Long shelterId, int days) {
        return reviewRepository.countReviewsByDayForShelter(shelterId, days);
    }

    @Override
    public List<ShelterReview> findReviewsByUserWithShelter(Long userId) {
        return reviewRepository.findReviewsByUserWithShelter(userId);
    }

    @Override
    public long countTotalApprovedReviews() {
        return reviewRepository.countTotalApprovedReviews();
    }

    @Override
    public List<Object[]> countReviewsByMonth() {
        return reviewRepository.countReviewsByMonth();
    }
}