package com.elif.dto.events.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de réponse pour les recommandations personnalisées.
 *
 * Contient :
 * - L'événement recommandé
 * - Son score de pertinence (0-100)
 * - Une explication lisible par l'utilisateur
 * - Des flags indiquant quels critères ont matché
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventRecommendationResponse {

    /**
     * L'événement recommandé (avec toutes ses infos)
     */
    private EventSummaryResponse event;

    /**
     * Score de pertinence global (0 à 100)
     * Plus le score est élevé, plus l'événement correspond à l'utilisateur
     */
    private Double score;

    /**
     * Explication lisible pour l'utilisateur
     * Exemple : "Recommandé car correspond à vos catégories favorites (Jazz)"
     */
    private String reason;

    /**
     * Indique si l'événement a été recommandé grâce à la catégorie
     * (utilisé pour afficher une icône ou un badge)
     */
    private Boolean matchedByCategory;

    /**
     * Indique si l'événement est populaire (>70% de remplissage)
     */
    private Boolean matchedByPopularity;

    /**
     * Indique si l'événement est bien noté (>4/5)
     */
    private Boolean matchedByRating;

    /**
     * Détail des scores par critère (pour débogage ou affichage avancé)
     */
    private ScoreBreakdown breakdown;

    /**
     * Détail des scores individuels par critère
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreBreakdown {
        private Double categoryScore;   // Score catégorie (0-35)
        private Double popularityScore; // Score popularité (0-25)
        private Double ratingScore;     // Score note (0-20)
        private Double proximityScore;  // Score proximité (0-15)
        private Double slotsScore;      // Score places (0-5)
        private Double totalScore;      // Total (0-100)
    }
}