package com.elif.services.events.interfaces;

import com.elif.dto.events.response.EventRecommendationResponse;
import com.elif.dto.events.response.EventSummaryResponse;

import java.util.List;

/**
 * ═══════════════════════════════════════════════════════════════════
 *  INTERFACE DU MOTEUR DE RECOMMANDATIONS ÉVÉNEMENTIELLES
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Service métier avancé qui implémente un algorithme de scoring
 *  multi-critères pour recommander les événements les plus pertinents
 *  à chaque utilisateur.
 *
 *  ALGORITHME DE SCORING :
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │  Score total = 35% Catégorie + 25% Popularité + 20% Note      │
 *  │                + 15% Proximité + 5% Places disponibles        │
 *  └────────────────────────────────────────────────────────────────┘
 */
public interface IEventRecommendationEngine {

    /**
     * Génère des recommandations personnalisées pour un utilisateur.
     *
     * L'algorithme :
     * 1. Analyse l'historique des inscriptions de l'utilisateur
     * 2. Identifie ses catégories préférées (fréquence + notes)
     * 3. Pour chaque événement candidat, calcule un score selon 5 critères
     * 4. Trie les événements par score décroissant
     * 5. Retourne les N meilleurs avec explication
     *
     * @param userId ID de l'utilisateur
     * @param limit  Nombre maximum de recommandations (1-20)
     * @return Liste des événements recommandés avec score et raison
     */
    List<EventRecommendationResponse> getPersonalizedRecommendations(Long userId, int limit);

    /**
     * Génère des recommandations "tendances" pour les utilisateurs
     * non connectés ou sans historique.
     *
     * Basé uniquement sur :
     * - Popularité (taux de remplissage) : 60%
     * - Note moyenne : 40%
     *
     * @param limit Nombre maximum de recommandations
     * @return Liste des événements tendance
     */
    List<EventSummaryResponse> getTrendingEvents(int limit);

    /**
     * Force le rafraîchissement du cache des recommandations
     * pour un utilisateur.
     *
     * À appeler après :
     * - Une nouvelle inscription
     * - Un nouvel avis
     * - La modification d'un événement
     *
     * @param userId ID de l'utilisateur
     */
    void refreshUserRecommendations(Long userId);
}