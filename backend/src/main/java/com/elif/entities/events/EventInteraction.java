package com.elif.entities.events;

import com.elif.entities.user.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Trace chaque interaction utilisateur avec un événement.
 * Sert de base au calcul du score de popularité pondéré.
 *
 * Architecture fire-and-forget :
 * - Les interactions sont enregistrées de façon asynchrone
 * - Jamais bloquantes pour l'utilisateur
 * - Purge automatique à J+180
 *
 * Index composites :
 *  - event_id              → agrégation rapide par événement
 *  - created_at            → purge et analyses temporelles
 *  - session_type_created  → déduplication vues anonymes (1h)
 */
@Entity
@Table(
        name = "event_interaction",
        indexes = {
                @Index(name = "idx_interaction_event", columnList = "event_id"),
                @Index(name = "idx_interaction_created", columnList = "created_at"),
                @Index(name = "idx_interaction_session_type", columnList = "session_id,type,created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Événement concerné — toujours non-null */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    /**
     * Utilisateur connecté (nullable → visiteur anonyme).
     * Un visiteur anonyme est identifié par sessionId.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /** Type d'interaction — détermine le poids dans le score */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InteractionType type;

    /**
     * Identifiant de session côté client (header X-Session-Id).
     * Permet de dédupliquer les vues pour les visiteurs anonymes.
     * Max 64 chars (UUID v4 = 36 chars).
     */
    @Column(name = "session_id", length = 64)
    private String sessionId;

    /**
     * Adresse IP (optionnelle) pour détection de bots.
     * Support IPv4 et IPv6 (max 45 chars).
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * Métadonnées JSON pour enrichir l'interaction.
     * Exemples :
     * - SEARCH_CLICK → {"keyword": "berger allemand", "position": 3}
     * - REGISTRATION → {"seats": 2, "eligibility_score": 85}
     * - REVIEW_POSTED → {"rating": 5, "comment_length": 120}
     */
    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    // ─── Méthodes utilitaires pour metadata ─────────────────────────

    public void setMetadataMap(Map<String, Object> metadataMap) {
        try {
            this.metadata = new ObjectMapper().writeValueAsString(metadataMap);
        } catch (JsonProcessingException e) {
            this.metadata = null;
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getMetadataMap() {
        if (metadata == null) return Map.of();
        try {
            return new ObjectMapper().readValue(metadata, Map.class);
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}