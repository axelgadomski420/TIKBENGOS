package com.elif.services.events.interfaces;

import com.elif.dto.events.request.EventReviewRequest;
import com.elif.dto.events.response.EventReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface IEventReviewService {

    /** Soumettre un avis (uniquement si l'événement est COMPLETED
     *  et que le user était participant confirmé) */
    EventReviewResponse submitReview(Long eventId, Long userId, EventReviewRequest request);

    /** Obtenir tous les avis d'un événement */
    Page<EventReviewResponse> getEventReviews(Long eventId, Pageable pageable);

    /** Modifier son propre avis */
    EventReviewResponse updateReview(Long reviewId, Long userId, EventReviewRequest request);

    /** Supprimer son propre avis */
    void deleteReview(Long reviewId, Long userId);
    void deleteReviewByAdmin(Long reviewId);
}