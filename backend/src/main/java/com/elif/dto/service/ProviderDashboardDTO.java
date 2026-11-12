package com.elif.dto.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Résultat structuré du dashboard IA pour un provider.
 * Retourné directement en JSON par le controller.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderDashboardDTO {

    /** Résumé synthétique de la journée du provider */
    private String summary;

    /** Liste des bookings priorisés avec niveau d'urgence */
    private List<PriorityItem> priorities;

    /** Insights business (services populaires, tendances, performance) */
    private List<String> insights;

    /** Recommandations actionnables pour améliorer l'activité */
    private List<String> recommendations;

    // ── Inner classes ─────────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PriorityItem {
        /** Identifiant de la réservation */
        private Long bookingId;
        /** Description courte (service + client) */
        private String description;
        /** URGENT / NORMAL / FAIBLE */
        private String level;
        /** Explication de la priorité */
        private String reason;
    }
}
