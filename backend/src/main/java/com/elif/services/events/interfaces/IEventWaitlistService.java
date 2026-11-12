package com.elif.services.events.interfaces;

import com.elif.dto.events.request.EventParticipantRequest;
import com.elif.dto.events.response.WaitlistResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Contrat métier de la liste d'attente.
 *
 * Règles métier :
 * - Seul un événement FULL accepte des entrées en liste d'attente
 * - Un utilisateur ne peut avoir qu'une seule entrée active par événement
 * - L'utilisateur notifié a 24h pour confirmer
 * - Si pas de confirmation dans 24h → expiration automatique
 */
public interface IEventWaitlistService {

    // ─── Méthodes existantes (gardées mais enrichies) ─────────────────

    /** Rejoindre la liste d'attente d'un événement FULL */
    WaitlistResponse joinWaitlist(Long eventId, Long userId, EventParticipantRequest request);

    /** Quitter la liste d'attente */
    void leaveWaitlist(Long eventId, Long userId);

    /** Ma position dans la file */
    WaitlistResponse getMyWaitlistEntry(Long eventId, Long userId);

    /** File d'attente complète (ADMIN) */
    Page<WaitlistResponse> getWaitlist(Long eventId, Long adminId, Pageable pageable);

    /** Toutes mes listes d'attente actives */
    Page<WaitlistResponse> getMyWaitlistEntries(Long userId, Pageable pageable);

    /** Promotion automatique du premier en attente (sans délai - ancien comportement) */
    boolean promoteNext(Long eventId);

    // ═══════════════════════════════════════════════════════════════════
    // NOUVELLES MÉTHODES (pour le délai de 24h)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * ADMIN : Notifie un utilisateur en liste d'attente qu'une place est disponible.
     * Passe son statut à NOTIFIED et fixe une deadline de deadlineHours heures.
     * Envoie une notification in-app à l'utilisateur.
     */
    WaitlistResponse notifyWaitlistEntry(Long waitlistEntryId, Long adminId, int deadlineHours);

    /**
     * CLIENT : Confirme la participation après notification de l'admin.
     * Doit être appelé avant expiration de la confirmationDeadline.
     * Crée une vraie inscription (EventParticipant) et libère la place dans l'événement.
     */
    WaitlistResponse confirmWaitlistEntry(Long eventId, Long userId);

    /**
     * SCHEDULER : Expire toutes les entrées NOTIFIED dont la deadline est dépassée.
     * Réorganise la file et propose la place au suivant.
     */
    void expireOverdueNotifications();

    /**
     * Promotion automatique AVEC DÉLAI (24h) du premier en attente.
     * À appeler après une annulation d'inscription.
     */
    void promoteFirstWaitingWithDeadline(Long eventId);
}