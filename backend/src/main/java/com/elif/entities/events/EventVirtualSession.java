package com.elif.entities.events;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

/**
 * Entité session virtuelle — VERSION MISE À JOUR
 *
 * Champs ajoutés :
 *  - moderatorPassword : mot de passe affiché dans le back-office
 *  - sessionStarted    : true après que l'admin a rejoint avec le bon mot de passe
 *
 * Lifecycle :
 *  SCHEDULED ──[scheduler: startDate - earlyAccess]──▶ OPEN
 *  OPEN      ──[admin entre mot de passe]────────────▶ sessionStarted=true
 *  OPEN      ──[scheduler: endDate + 5min]───────────▶ CLOSED ──▶ traitement assiduité ──▶ ARCHIVED
 */
@Entity
@Table(name = "event_virtual_session",
        indexes = @Index(name = "idx_session_event", columnList = "event_id"))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EventVirtualSession {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false, unique = true)
    private Event event;

    @Column(name = "access_token", nullable = false, unique = true, length = 64)
    private String accessToken;

    @Column(name = "room_url", nullable = false, length = 500)
    private String roomUrl;

    @Builder.Default
    @Column(name = "early_access_minutes", nullable = false)
    private Integer earlyAccessMinutes = 15;

    @Builder.Default
    @Column(name = "attendance_threshold_percent", nullable = false)
    private Integer attendanceThresholdPercent = 80;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private VirtualSessionStatus status = VirtualSessionStatus.SCHEDULED;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Mot de passe généré automatiquement à la création.
     * Format : ELIF-{eventId}-{year}-{token4chars}
     * Affiché dans le back-office admin uniquement.
     */
    @Column(name = "moderator_password", nullable = false, length = 32)
    private String moderatorPassword;

    /**
     * Passe à true quand l'admin rejoint avec le bon mot de passe.
     * Déclenche la notification "session started" aux participants.
     * Avant ce moment : les participants CONFIRMED voient "⏳ Waiting for organizer".
     */
    @Builder.Default
    @Column(name = "session_started", nullable = false)
    private boolean sessionStarted = false;

    // ── Méthodes métier ─────────────────────────────────────────

    public void open() {
        this.status   = VirtualSessionStatus.OPEN;
        this.openedAt = LocalDateTime.now();
    }

    public void close() {
        this.status   = VirtualSessionStatus.CLOSED;
        this.closedAt = LocalDateTime.now();
    }

    public void startSession() {
        this.sessionStarted = true;
    }

    /**
     * Fenêtre d'accès : de (startDate - earlyAccessMinutes) à (endDate + 5 min)
     */
    public boolean isAccessWindowOpen() {
        if (this.status != VirtualSessionStatus.OPEN) return false;
        LocalDateTime now   = LocalDateTime.now();
        LocalDateTime start = event.getStartDate().minusMinutes(earlyAccessMinutes);
        LocalDateTime end   = event.getEndDate().plusMinutes(5);
        return !now.isBefore(start) && !now.isAfter(end);
    }
}