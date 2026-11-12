package com.elif.controllers.events;

import com.elif.dto.events.request.CreateVirtualSessionRequest;
import com.elif.dto.events.response.JoinSessionResponse;
import com.elif.dto.events.response.SessionStatsResponse;
import com.elif.dto.events.response.VirtualSessionResponse;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.services.events.implementations.EventVirtualSessionService;
import com.elif.services.user.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * ════════════════════════════════════════════════════════════════
 *  EventVirtualSessionController — VERSION COMPLÈTE
 * ════════════════════════════════════════════════════════════════
 *
 *  POST   /api/events/{id}/virtual               Créer la salle    (ADMIN)
 *  GET    /api/events/{id}/virtual               Lire la session   (public, adapté selon userId)
 *  GET    /api/events/{id}/virtual/admin         Lire session ADMIN avec mot de passe
 *  POST   /api/events/{id}/virtual/join/moderator Rejoindre comme modérateur (ADMIN + mdp)
 *  POST   /api/events/{id}/virtual/join/participant Rejoindre comme participant (CONFIRMED)
 *  POST   /api/events/{id}/virtual/leave         Quitter la salle
 *  GET    /api/events/{id}/virtual/stats         Rapport assiduité (ADMIN, après fermeture)
 *
 * ════════════════════════════════════════════════════════════════
 */
@RestController
@RequestMapping("/api/events/{eventId}/virtual")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
public class EventVirtualSessionController {

    private final EventVirtualSessionService virtualService;
    private final IUserService               userService;

    // ── Créer la salle (ADMIN) ────────────────────────────────────

    @PostMapping
    public ResponseEntity<VirtualSessionResponse> createSession(
            @PathVariable Long eventId,
            @Valid @RequestBody CreateVirtualSessionRequest request,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return forbidden();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(virtualService.createSession(eventId, userId, request));
    }

    // ── Lire la session (public, adapté selon userId) ─────────────

    /**
     * Retourne les infos de la session.
     * - userId optionnel : si fourni, calcule isConfirmedParticipant et canJoinNow
     * - roomUrl masqué si canJoinNow=false
     * - Retourne 204 si aucune session configurée (le frontend affiche rien)
     */
    @GetMapping
    public ResponseEntity<VirtualSessionResponse> getSession(
            @PathVariable Long eventId,
            @RequestParam(required = false) Long userId) {

        VirtualSessionResponse session = virtualService.getSession(eventId, userId);
        if (session == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(session);
    }

    // ── Lire la session côté ADMIN (avec mot de passe modérateur) ─

    @GetMapping("/admin")
    public ResponseEntity<VirtualSessionResponse> getSessionForAdmin(
            @PathVariable Long eventId,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return forbidden();
        return ResponseEntity.ok(virtualService.getSessionForAdmin(eventId));
    }

    // ── Rejoindre comme MODÉRATEUR (ADMIN + mot de passe) ────────

    /**
     * L'admin clique "Start session" dans le back-office.
     * Fournit le mot de passe affiché dans la vue admin.
     * Si c'est la première connexion : sessionStarted=true, notifie les participants.
     */
    @PostMapping("/join/moderator")
    public ResponseEntity<JoinSessionResponse> joinAsModerator(
            @PathVariable Long eventId,
            @RequestParam Long userId,
            @RequestParam String password) {

        if (!isAdmin(userId)) return forbidden();
        JoinSessionResponse response = virtualService.joinAsModerator(eventId, userId, password);
        return ResponseEntity.ok(response);
    }

    // ── Rejoindre comme PARTICIPANT ───────────────────────────────

    /**
     * Le participant clique "Join virtual room" dans le front-office.
     * Retourne :
     *   - canJoin=true + roomUrl → redirection vers Jitsi
     *   - canJoin=false + waitingForModerator=true → "⏳ Waiting for organizer"
     *   - canJoin=false + message → erreur lisible
     */
    @PostMapping("/join/participant")
    public ResponseEntity<JoinSessionResponse> joinAsParticipant(
            @PathVariable Long eventId,
            @RequestParam Long userId) {

        JoinSessionResponse response = virtualService.joinAsParticipant(eventId, userId);
        return ResponseEntity.ok(response);
    }

    // ── Quitter la salle ─────────────────────────────────────────

    /**
     * Enregistre la sortie : leftAt = now, accumule totalSecondsPresent.
     * Idempotent : sans effet si l'utilisateur n'est pas connecté.
     * Appelé aussi automatiquement par ngOnDestroy du panel Angular.
     */
    @PostMapping("/leave")
    public ResponseEntity<Void> leaveSession(
            @PathVariable Long eventId,
            @RequestParam Long userId) {

        virtualService.leaveSession(eventId, userId);
        return ResponseEntity.noContent().build();
    }

    // ── Rapport assiduité (ADMIN, après fermeture) ────────────────

    @GetMapping("/stats")
    public ResponseEntity<SessionStatsResponse> getStats(
            @PathVariable Long eventId,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return forbidden();
        return ResponseEntity.ok(virtualService.getSessionStats(eventId));
    }

    // ── Helpers ───────────────────────────────────────────────────

    private boolean isAdmin(Long userId) {
        User user = userService.findUser(userId);
        return user != null && user.getRole() == Role.ADMIN;
    }

    @SuppressWarnings("unchecked")
    private <T> ResponseEntity<T> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }
}