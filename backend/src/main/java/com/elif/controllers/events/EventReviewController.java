package com.elif.controllers.events;

import com.elif.dto.events.request.EventReviewRequest;
import com.elif.dto.events.response.EventReviewResponse;
import com.elif.entities.user.Role;
import com.elif.services.events.interfaces.IEventReviewService;
import com.elif.services.user.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventReviewController {

    private final IEventReviewService reviewService;
    private final IUserService userService;

    //  Seul USER peut laisser un avis
    @PostMapping("/{id}/reviews")
    public ResponseEntity<EventReviewResponse> submitReview(
            @PathVariable Long id,
            @Valid @RequestBody EventReviewRequest request,
            @RequestParam Long userId) {

        com.elif.entities.user.User user = userService.findUser(userId);
        if (user == null || user.getRole() != Role.USER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.submitReview(id, userId, request));
    }

    //  Tout le monde peut voir les avis
    @GetMapping("/{id}/reviews")
    public ResponseEntity<Page<EventReviewResponse>> getEventReviews(
            @PathVariable Long id,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reviewService.getEventReviews(id, pageable));
    }

    //  Seul USER peut modifier son propre avis
    @PutMapping("/reviews/{reviewId}")
    public ResponseEntity<EventReviewResponse> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody EventReviewRequest request,
            @RequestParam Long userId) {

        com.elif.entities.user.User user = userService.findUser(userId);
        if (user == null || user.getRole() != Role.USER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(reviewService.updateReview(reviewId, userId, request));
    }

    //  Seul USER peut supprimer son propre avis
    // ✅ MODIFIER : ADMIN peut supprimer n'importe quel avis
    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long reviewId,
            @RequestParam Long userId) {

        com.elif.entities.user.User user = userService.findUser(userId);

        // ✅ Vérifier que l'utilisateur existe
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // ✅ ADMIN peut tout supprimer
        if (user.getRole() == Role.ADMIN) {
            reviewService.deleteReviewByAdmin(reviewId);
            return ResponseEntity.noContent().build();
        }

        // ✅ USER ne peut supprimer que ses propres avis
        if (user.getRole() == Role.USER) {
            reviewService.deleteReview(reviewId, userId);
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }
}