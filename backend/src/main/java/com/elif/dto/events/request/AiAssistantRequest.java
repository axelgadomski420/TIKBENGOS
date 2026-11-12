package com.elif.dto.events.request;

import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

/**
 * Requête unifiée pour l'assistant IA.
 * Utilisé par les 4 modes : SMART_MATCH, INSIGHTS, ADVISOR, COMPARE
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiAssistantRequest {

    /**
     * Query texte libre (smart-match, advisor)
     */
    @Size(max = 1000, message = "Query must be under 1000 characters")
    private String query;

    /**
     * Contexte de l'animal (optionnel, enrichit les réponses)
     * ex: "Border Collie, 2 ans, niveau agility intermédiaire"
     */
    @Size(max = 500)
    private String petContext;

    /**
     * Filtrage par catégorie
     */
    private Long categoryId;

    /**
     * Nombre max d'événements à analyser (default: 20)
     */
    private int maxEvents = 20;

    /**
     * [INSIGHTS] ID de l'événement à analyser en détail
     */
    private Long targetEventId;

    /**
     * [COMPARE] IDs des événements à comparer (2-4 max)
     */
    private List<Long> compareEventIds;

    /**
     * Langue de réponse souhaitée (auto-detect si null)
     * ex: "fr", "en", "ar"
     */
    private String language;

    /**
     * Historique de conversation (mode advisor multi-tour)
     * Format: [{"role":"user","content":"..."}, {"role":"assistant","content":"..."}]
     */
    private List<ConversationTurn> conversationHistory;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationTurn {
        private String role;    // "user" | "assistant"
        private String content;
    }
}