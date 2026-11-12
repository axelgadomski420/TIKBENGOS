package com.elif.controllers.service;

import com.elif.dto.service.ServiceReviewDTO;
import com.elif.exceptions.ResourceNotFoundException;
import com.elif.services.service.ServiceReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/services/{serviceId}/reviews")
public class ServiceReviewController {

    private final ServiceReviewService reviewService;

    public ServiceReviewController(ServiceReviewService reviewService) {
        this.reviewService = reviewService;
    }

    // GET /api/services/{serviceId}/reviews
    @GetMapping
    public ResponseEntity<List<ServiceReviewDTO>> getReviews(@PathVariable Long serviceId) {
        return ResponseEntity.ok(reviewService.getReviewsByServiceId(serviceId));
    }

    // POST /api/services/{serviceId}/reviews
    @PostMapping
    public ResponseEntity<ServiceReviewDTO> addReview(
            @PathVariable Long serviceId,
            @RequestBody ServiceReviewDTO dto) {
        ServiceReviewDTO saved = reviewService.addReview(serviceId, dto);
        return ResponseEntity.status(201).body(saved);
    }

    // DELETE /api/services/{serviceId}/reviews/{reviewId}
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long serviceId,
            @PathVariable Long reviewId) {
        reviewService.deleteReview(reviewId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body(e.getMessage());
    }
}
