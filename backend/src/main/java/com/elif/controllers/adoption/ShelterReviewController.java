package com.elif.controllers.adoption;

import com.elif.dto.adoption.request.ShelterReviewRequestDTO;
import com.elif.dto.adoption.response.ShelterReviewResponseDTO;
import com.elif.entities.adoption.ShelterReview;
import com.elif.services.adoption.interfaces.ShelterReviewService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/adoption/shelters/{shelterId}/reviews")
@CrossOrigin(origins = "http://localhost:4200")
public class ShelterReviewController {

    private final ShelterReviewService reviewService;

    // ============================================================
    // CONSTRUCTEUR
    // ============================================================

    public ShelterReviewController(ShelterReviewService reviewService) {
        this.reviewService = reviewService;
    }

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    @GetMapping
    public ResponseEntity<List<ShelterReviewResponseDTO>> getReviewsByShelter(@PathVariable Long shelterId) {
        List<ShelterReview> reviews = reviewService.findApprovedByShelterId(shelterId);
        List<ShelterReviewResponseDTO> response = reviews.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/all")
    public ResponseEntity<List<ShelterReviewResponseDTO>> getAllReviewsByShelter(@PathVariable Long shelterId) {
        List<ShelterReview> reviews = reviewService.findByShelterId(shelterId);
        List<ShelterReviewResponseDTO> response = reviews.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{reviewId}")
    public ResponseEntity<ShelterReviewResponseDTO> getReviewById(@PathVariable Long reviewId) {
        ShelterReview review = reviewService.findById(reviewId);
        return ResponseEntity.ok(toResponseDTO(review));
    }

    @PostMapping
    public ResponseEntity<ShelterReviewResponseDTO> createReview(
            @PathVariable Long shelterId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody ShelterReviewRequestDTO request) {
        ShelterReview review = reviewService.create(shelterId, userId, request.getRating(), request.getComment());
        return new ResponseEntity<>(toResponseDTO(review), HttpStatus.CREATED);
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long reviewId,
            @RequestHeader("X-User-Id") Long userId) {
        reviewService.deleteReview(reviewId, userId);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // MÉTHODES ADMIN
    // ============================================================

    @PutMapping("/{reviewId}/approve")
    public ResponseEntity<ShelterReviewResponseDTO> approveReview(@PathVariable Long reviewId) {
        ShelterReview approved = reviewService.approveReview(reviewId);
        return ResponseEntity.ok(toResponseDTO(approved));
    }

    @DeleteMapping("/{reviewId}/reject")
    public ResponseEntity<Void> rejectReview(@PathVariable Long reviewId) {
        reviewService.rejectReview(reviewId);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // MÉTHODES DE STATISTIQUES
    // ============================================================

    @GetMapping("/stats/average")
    public ResponseEntity<Double> getAverageRating(@PathVariable Long shelterId) {
        return ResponseEntity.ok(reviewService.getAverageRating(shelterId));
    }

    @GetMapping("/stats/total")
    public ResponseEntity<Long> getTotalReviews(@PathVariable Long shelterId) {
        return ResponseEntity.ok(reviewService.getTotalReviews(shelterId));
    }

    // ============================================================
    // MÉTHODE DE CONVERSION
    // ============================================================

    private ShelterReviewResponseDTO toResponseDTO(ShelterReview review) {
        if (review == null) {
            return null;
        }
        String userName = "Utilisateur";
        if (review.getUser() != null) {
            userName = review.getUser().getFirstName() + " " + review.getUser().getLastName();
        }
        return ShelterReviewResponseDTO.builder()
                .id(review.getId())
                .shelterId(review.getShelter().getId())
                .shelterName(review.getShelter().getName())
                .userId(review.getUser().getId())
                .userName(userName)
                .rating(review.getRating())
                .comment(review.getComment())
                .isApproved(review.getIsApproved())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}