package com.elif.dto.events.response;

import com.elif.entities.events.VirtualSessionStatus;
import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO réponse session virtuelle — VERSION COMPLÈTE
 *
 * Champs ajoutés vs ancienne version :
 *  - isConfirmedParticipant : le user appelant est-il inscrit CONFIRMED ?
 *  - sessionStarted         : l'admin a-t-il déjà rejoint et démarré la session ?
 *  - waitingForModerator    : confirmé mais en attente du modérateur ?
 *  - moderatorPassword      : mot de passe (exposé uniquement dans toResponseAdmin)
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class VirtualSessionResponse {

    private Long                 id;
    private Long                 eventId;
    private String               eventTitle;

    /** URL Jitsi sécurisée — fournie uniquement si canJoinNow=true */
    private String               roomUrl;

    private int                  earlyAccessMinutes;
    private int                  attendanceThresholdPercent;
    private VirtualSessionStatus status;

    private LocalDateTime        openedAt;
    private LocalDateTime        closedAt;

    /** Début de la fenêtre d'accès : startDate - earlyAccessMinutes */
    private LocalDateTime        accessWindowStart;
    /** Fin de la fenêtre d'accès   : endDate + 5 min */
    private LocalDateTime        accessWindowEnd;

    // ── Flags calculés pour le frontend ─────────────────────────

    /** true si l'utilisateur peut rejoindre maintenant (OPEN + CONFIRMED + sessionStarted) */
    private boolean canJoinNow;

    /** true si l'admin a démarré la session (cliqué "Start session") */
    private boolean sessionStarted;

    /**
     * true si :
     *   - status = OPEN
     *   - user est CONFIRMED
     *   - sessionStarted = false (l'admin n'a pas encore rejoint)
     *
     * → le frontend affiche "⏳ Waiting for organizer"
     */
    private boolean isConfirmedParticipant;

    /** Alias direct pour le template */
    private boolean waitingForModerator;

    /** Mot de passe modérateur — UNIQUEMENT pour l'admin (toResponseAdmin) */
    private String               moderatorPassword;

    /** Message contextuel lisible */
    private String               statusMessage;
}