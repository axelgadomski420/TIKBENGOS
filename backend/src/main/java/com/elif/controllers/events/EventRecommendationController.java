package com.elif.controllers.events;

import com.elif.dto.events.response.EventRecommendationResponse;
import com.elif.dto.events.response.EventSummaryResponse;
import com.elif.services.events.interfaces.IEventRecommendationEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur pour le moteur de recommandations.
 *
 * Endpoints :
 * - GET  /api/recommendations/personalized?userId=1&limit=10
 * - GET  /api/recommendations/trending?limit=10
 * - POST /api/recommendations/refresh?userId=1
 */
@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class EventRecommendationController {

    private final IEventRecommendationEngine recommendationEngine;

    /**
     * GET /api/recommendations/personalized?userId=1&limit=10
     *
     * Retourne des recommandations personnalisées pour l'utilisateur.
     * Utilise l'algorithme de scoring multi-critères.
     */
    @GetMapping("/personalized")
    public ResponseEntity<List<EventRecommendationResponse>> getPersonalizedRecommendations(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "10") int limit) {

        log.info("📱 Requête de recommandations pour userId={}, limit={}", userId, limit);
        List<EventRecommendationResponse> recommendations =
                recommendationEngine.getPersonalizedRecommendations(userId, limit);
        return ResponseEntity.ok(recommendations);
    }

    /**
     * GET /api/recommendations/trending?limit=10
     *
     * Retourne les événements tendance (utilisateurs non connectés).
     * Basé sur popularité et notes.
     */
    @GetMapping("/trending")
    public ResponseEntity<List<EventSummaryResponse>> getTrendingEvents(
            @RequestParam(defaultValue = "10") int limit) {

        log.info("📈 Requête d'événements tendance, limit={}", limit);
        List<EventSummaryResponse> trending = recommendationEngine.getTrendingEvents(limit);
        return ResponseEntity.ok(trending);
    }

    /**
     * POST /api/recommendations/refresh?userId=1
     *
     * Force le rafraîchissement du cache des recommandations.
     * À appeler après une inscription ou un nouvel avis.
     */
    @PostMapping("/refresh")
    public ResponseEntity<Void> refreshRecommendations(@RequestParam Long userId) {
        log.info("🔄 Rafraîchissement du cache pour userId={}", userId);
        recommendationEngine.refreshUserRecommendations(userId);
        return ResponseEntity.ok().build();
    }
}