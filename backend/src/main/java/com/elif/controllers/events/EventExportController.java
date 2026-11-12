package com.elif.controllers.events;

import com.elif.entities.user.Role;
import com.elif.services.events.interfaces.IEventExportService;
import com.elif.services.user.IUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Contrôleur d'export CSV (ADMIN uniquement).
 *
 * Endpoints :
 *  GET /api/events/export/all              → CSV tous les événements
 *  GET /api/events/{id}/export/participants → CSV participants d'un événement
 */
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventExportController {

    private final IEventExportService exportService;
    private final IUserService        userService;

    /**
     * GET /api/events/export/all?userId=1
     * Télécharge un CSV de tous les événements.
     */
    @GetMapping("/export/all")
    public ResponseEntity<byte[]> exportAllEvents(@RequestParam Long userId) {
        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        byte[] csv = exportService.exportEventsCsv();
        String filename = "evenements_" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(csv);
    }

    /**
     * GET /api/events/{id}/export/participants?userId=1
     * Télécharge un CSV des participants confirmés d'un événement.
     */
    @GetMapping("/{id}/export/participants")
    public ResponseEntity<byte[]> exportParticipants(
            @PathVariable Long id,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        byte[] csv = exportService.exportParticipantsCsv(id);
        String filename = "participants_event_" + id + "_" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(csv);
    }

    // ─── Helper ───────────────────────────────────────────────────────

    private boolean isAdmin(Long userId) {
        com.elif.entities.user.User user = userService.findUser(userId);
        return user != null && user.getRole() == Role.ADMIN;
    }
}
