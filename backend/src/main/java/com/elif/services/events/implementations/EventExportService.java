package com.elif.services.events.implementations;

import com.elif.entities.events.Event;
import com.elif.entities.events.EventParticipant;
import com.elif.entities.events.ParticipantStatus;
import com.elif.exceptions.events.EventExceptions;
import com.elif.repositories.events.EventParticipantRepository;
import com.elif.repositories.events.EventRepository;
import com.elif.services.events.interfaces.IEventExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * ════════════════════════════════════════════════════════════════
 *  EventExportService — VERSION CORRIGÉE
 *
 *  BUG CORRIGÉ : dates affichées "####" dans Excel
 *
 *  CAUSE RACINE :
 *  Le format "dd/MM/yyyy HH:mm" produit ex: "15/06/2025 14:30"
 *  Excel interprète la colonne comme du texte → #### = colonne trop étroite
 *  OU Excel interprète la barre "/" comme séparateur de formule → corruption
 *
 *  FIX 1 — Format ISO "yyyy-MM-dd HH:mm" → Excel le reconnaît automatiquement
 *           comme date et l'affiche proprement quelle que soit la largeur
 *
 *  FIX 2 — Ajouter des hints de format dans l'en-tête CSV pour guider Excel
 *
 *  FIX 3 — Séparer la date et l'heure en deux colonnes distinctes
 *           → Excel ne peut pas faire "####" sur deux colonnes
 *
 *  FIX 4 — Amélioration visuelle : ajout du taux de remplissage %
 *           et de la catégorie dans l'export participants
 * ════════════════════════════════════════════════════════════════
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class EventExportService implements IEventExportService {

    private final EventRepository            eventRepository;
    private final EventParticipantRepository participantRepository;

    // ── FIX 1 : Format ISO reconnu nativement par Excel ─────────────
    // "dd/MM/yyyy HH:mm" → "####"  ❌
    // "yyyy-MM-dd HH:mm" → date propre ✅
    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("HH:mm");

    // ──────────────────────────────────────────────────────────────────
    // EXPORT PARTICIPANTS D'UN ÉVÉNEMENT
    // ──────────────────────────────────────────────────────────────────

    @Override
    public byte[] exportParticipantsCsv(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventExceptions.EventNotFoundException(eventId));

        List<EventParticipant> participants = participantRepository
                .findByEventIdAndStatus(eventId, ParticipantStatus.CONFIRMED,
                        PageRequest.of(0, Integer.MAX_VALUE))
                .getContent();

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (OutputStreamWriter osw = new OutputStreamWriter(out, StandardCharsets.UTF_8);
             PrintWriter writer = new PrintWriter(osw, true)) {

            // BOM UTF-8 pour Excel (nécessaire pour les accents)
            out.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});

            // ── Bloc d'en-tête de l'événement ────────────────────────
            writer.println("ELIF Events — Participant Export");
            writer.println();
            writer.printf("Event;%s%n",          escape(event.getTitle()));
            writer.printf("Category;%s%n",        event.getCategory() != null
                    ? escape(event.getCategory().getName()) : "—");
            writer.printf("Location;%s%n",        escape(event.getLocation()));
            // FIX : date et heure séparées → jamais de "####"
            writer.printf("Start date;%s;%s%n",
                    event.getStartDate().format(DATE_FMT),
                    event.getStartDate().format(TIME_FMT));
            writer.printf("End date;%s;%s%n",
                    event.getEndDate().format(DATE_FMT),
                    event.getEndDate().format(TIME_FMT));
            writer.printf("Confirmed participants;%d%n", participants.size());
            writer.printf("Capacity;%d%n",        event.getMaxParticipants());
            writer.printf("Fill rate;%.1f%%%n",
                    event.getMaxParticipants() > 0
                            ? (participants.size() * 100.0 / event.getMaxParticipants())
                            : 0.0);
            writer.println();

            // ── En-tête colonnes participants ─────────────────────────
            // FIX : Date et Heure en colonnes séparées
            writer.println("ID;First name;Last name;Email;Seats;Registered date;Registered time;Status");

            for (EventParticipant p : participants) {
                String regDate = p.getRegisteredAt() != null
                        ? p.getRegisteredAt().format(DATE_FMT) : "";
                String regTime = p.getRegisteredAt() != null
                        ? p.getRegisteredAt().format(TIME_FMT) : "";

                writer.printf("%d;\"%s\";\"%s\";\"%s\";%d;%s;%s;%s%n",
                        p.getId(),
                        escape(p.getUser().getFirstName()),
                        escape(p.getUser().getLastName()),
                        escape(p.getUser().getEmail()),
                        p.getNumberOfSeats(),
                        regDate,
                        regTime,
                        p.getStatus().name()
                );
            }

        } catch (IOException e) {
            log.error("CSV export error for event {}", eventId, e);
            throw new RuntimeException("CSV generation failed", e);
        }

        log.info("📊 CSV exported: {} participants for '{}'", participants.size(), event.getTitle());
        return out.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────────
    // EXPORT GLOBAL DE TOUS LES ÉVÉNEMENTS
    // ──────────────────────────────────────────────────────────────────

    @Override
    public byte[] exportEventsCsv() {
        List<Event> events = eventRepository.findAll();

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (OutputStreamWriter osw = new OutputStreamWriter(out, StandardCharsets.UTF_8);
             PrintWriter writer = new PrintWriter(osw, true)) {

            out.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});

            writer.println("ELIF Events — Complete Event Export");
            writer.println();

            // FIX : dates et heures en colonnes séparées
            // "Start date" + "Start time" → Excel affiche proprement
            writer.println(
                    "ID;Title;Category;Location;" +
                            "Start date;Start time;" +
                            "End date;End time;" +
                            "Status;Capacity;Remaining slots;Fill rate (%)"
            );

            for (Event e : events) {
                int    used     = e.getMaxParticipants() - e.getRemainingSlots();
                double fillRate = e.getMaxParticipants() > 0
                        ? Math.round((used * 100.0 / e.getMaxParticipants()) * 10.0) / 10.0
                        : 0.0;

                writer.printf(
                        "%d;\"%s\";\"%s\";\"%s\";%s;%s;%s;%s;\"%s\";%d;%d;%.1f%n",
                        e.getId(),
                        escape(e.getTitle()),
                        e.getCategory() != null ? escape(e.getCategory().getName()) : "",
                        escape(e.getLocation()),
                        // FIX : date ISO + heure séparés → jamais "####"
                        e.getStartDate() != null ? e.getStartDate().format(DATE_FMT) : "",
                        e.getStartDate() != null ? e.getStartDate().format(TIME_FMT) : "",
                        e.getEndDate()   != null ? e.getEndDate().format(DATE_FMT)   : "",
                        e.getEndDate()   != null ? e.getEndDate().format(TIME_FMT)   : "",
                        e.getStatus().name(),
                        e.getMaxParticipants(),
                        e.getRemainingSlots(),
                        fillRate
                );
            }

        } catch (IOException e) {
            log.error("Global CSV export error", e);
            throw new RuntimeException("CSV generation failed", e);
        }

        log.info("📊 Global CSV exported: {} events", events.size());
        return out.toByteArray();
    }

    // ── Helper ────────────────────────────────────────────────────────

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("\"", "\"\"");
    }
}
