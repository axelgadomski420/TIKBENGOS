package com.elif.services.events.interfaces;

import com.elif.dto.events.popularity.response.EventPopularityDetailDTO;
import com.elif.dto.events.popularity.response.PopularEventDTO;
import com.elif.dto.events.popularity.response.PopularityDashboardDTO;
import com.elif.entities.events.InteractionType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.annotation.Transactional;

import java.time.Period;
import java.util.List;

/**
 * Interface du service de suivi de popularité des événements.
 *
 * Responsabilités :
 *  1. Enregistrer les interactions utilisateur (track)
 *  2. Calculer les scores de popularité pondérés
 *  3. Identifier les événements négligés
 *  4. Exposer le dashboard admin complet
 *  5. Nettoyer les anciennes interactions (maintenance)
 */
public interface IEventPopularityTrackingService {

    /**
     * Enregistre une interaction utilisateur sur un événement.
     * Déduplique automatiquement les vues par session/heure.
     *
     * @param eventId   ID de l'événement
     * @param type      Type d'interaction
     * @param userId    ID utilisateur (null si anonyme)
     * @param sessionId Identifiant de session (header X-Session-Id)
     * @param ipAddress Adresse IP (optionnelle, pour détection de bots)
     */
    void track(Long eventId, InteractionType type, Long userId, String sessionId, String ipAddress);

    /**
     * Retourne les N événements les plus populaires sur une période.
     * Score = somme pondérée de toutes les interactions.
     *
     * @param limit  Nombre d'événements retournés
     * @param period Fenêtre temporelle (ex: Period.ofDays(30))
     */
    List<PopularEventDTO> getTopPopularEvents(int limit, Period period);

    /**
     * Retourne les événements PLANNED avec peu de vues.
     * Ces événements ont besoin de visibilité accrue.
     *
     * @param limit     Nombre d'événements retournés
     * @param threshold Seuil de vues en-dessous duquel l'event est "négligé"
     */
    List<PopularEventDTO> getNeglectedEvents(int limit, long threshold);

    /**
     * Dashboard complet pour l'admin :
     * top events + négligés + stats globales + taux de conversion.
     */
    PopularityDashboardDTO getAdminDashboard();

    /**
     * Détail de popularité d'un événement spécifique :
     * breakdown par type + taux de conversion + tendance.
     */
    EventPopularityDetailDTO getEventPopularityDetail(Long eventId);

    @Async
    @Transactional
    void trackAsync(Long eventId, InteractionType type, Long userId,
                    String sessionId, String ipAddress);

    /**
     * Invalide le cache du dashboard (après mise à jour).
     */
    void invalidateCache();

    /**
     * Supprime les interactions antérieures à N mois.
     * Appelé automatiquement par le scheduler mensuel.
     *
     * @param monthsToKeep Nombre de mois à conserver
     * @return Nombre de lignes supprimées
     */
    int cleanOldInteractions(int monthsToKeep);

    @Transactional
    void recalculateAllScores();
}