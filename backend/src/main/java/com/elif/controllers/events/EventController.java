package com.elif.controllers.events;

import com.elif.dto.events.request.EventCreateRequest;
import com.elif.dto.events.request.EventUpdateRequest;
import com.elif.dto.events.response.*;
import com.elif.entities.events.Event;
import com.elif.entities.events.EventStatus;
import com.elif.entities.user.Role;
import com.elif.services.events.implementations.EventEligibilityService;
import com.elif.services.events.implementations.EventStatsService;
import com.elif.services.events.implementations.ImageUploadService;
import com.elif.services.events.interfaces.IEventService;
import com.elif.services.events.interfaces.IEventWaitlistService;
import com.elif.services.events.interfaces.IWeatherService;
import com.elif.services.user.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
public class EventController {

    private final IEventService     eventService;
    private final IUserService      userService;
    private final EventStatsService eventStatsService;
    private final IWeatherService   weatherService;
    private final ImageUploadService imageUploadService;
    private final EventEligibilityService eligibilityService;
    private final IEventWaitlistService waitlistService;
    /** POST /api/events — Créer un événement (ADMIN) avec support multipart */
    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_JSON_VALUE})
    public ResponseEntity<EventDetailResponse> createEvent(
            @Valid @ModelAttribute EventCreateRequest request,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.createEvent(request, userId));
    }
    @PostMapping("/{id}/check-eligibility")
    public ResponseEntity<EventEligibilityService.EligibilityResult> checkEligibility(
            @PathVariable Long id,
            @RequestBody EventEligibilityService.PetRegistrationData petData) {



        Event event = eventService.findEventOrThrow(id);

        // Vérifier que l'événement est une compétition
        if (event.getCategory() == null || !Boolean.TRUE.equals(event.getCategory().getCompetitionMode())) {
            return ResponseEntity.badRequest().build();
        }

        // Évaluer l'éligibilité (userId = null car pas d'inscription)
        EventEligibilityService.EligibilityResult result =
                eligibilityService.evaluate(event, petData, null);

        return ResponseEntity.ok(result);
    }

    /** GET /api/events — Liste paginée avec filtres */
    // EventController.java - CORRECTION
    @GetMapping
    public ResponseEntity<Page<EventSummaryResponse>> getAllEvents(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 12, sort = "startDate") Pageable pageable) {
        EventStatus eventStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                eventStatus = EventStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
            }
        }
        return ResponseEntity.ok(eventService.getAllEvents(eventStatus, categoryId, keyword, pageable));
    }

    /** POST /api/events/upload-image — Endpoint dédié pour l'upload d'image */
    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            String imageUrl = imageUploadService.uploadEventImage(file);
            return ResponseEntity.ok(Map.of("url", imageUrl));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload image: " + e.getMessage()));
        }
    }

    /** GET /api/events/{id} — Détail d'un événement (public) */
    @GetMapping("/{id}")
    public ResponseEntity<EventDetailResponse> getEventById(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    /** PUT /api/events/{id} — Modifier un événement avec support multipart */
    @PutMapping(value = "/{id}", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_JSON_VALUE})
    public ResponseEntity<EventDetailResponse> updateEvent(
            @PathVariable Long id,
            @Valid @ModelAttribute EventUpdateRequest request,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(eventService.updateEvent(id, request, userId));
    }

    /** PATCH /api/events/{id}/cancel — Annuler un événement (ADMIN) */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<EventDetailResponse> cancelEvent(
            @PathVariable Long id,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(eventService.updateEventStatus(id, EventStatus.CANCELLED, userId));
    }

    /** DELETE /api/events/{id} — Supprimer un événement (ADMIN) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long id,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        eventService.deleteEvent(id, userId);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/events/my — Mes événements organisés */
    @GetMapping("/my")
    public ResponseEntity<Page<EventSummaryResponse>> getMyEvents(
            @RequestParam Long userId,
            @PageableDefault(size = 10, sort = "startDate") Pageable pageable) {
        return ResponseEntity.ok(eventService.getMyOrganizedEvents(userId, pageable));
    }

    // ─────────────────────────────────────────────────────────────────
    // CALENDRIER
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/calendar")
    public ResponseEntity<Map<String, List<EventSummaryResponse>>> getCalendar(
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(eventService.getCalendarEvents(year, month));
    }

    // ─────────────────────────────────────────────────────────────────
    // STATISTIQUES ADMIN
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/admin/stats")
    public ResponseEntity<EventStatsResponse> getAdminStats(@RequestParam Long userId) {
        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(eventStatsService.getAdminStats());
    }

    // ─────────────────────────────────────────────────────────────────
    // MÉTÉO
    // ─────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────
// MÉTÉO - CORRIGÉ AVEC DATE
// ─────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/weather")
    public ResponseEntity<WeatherResponse> getEventWeather(@PathVariable Long id) {
        return ResponseEntity.ok(weatherService.getWeatherForEvent(id));
    }

    @GetMapping("/weather")
    public ResponseEntity<WeatherResponse> getWeatherByCity(
            @RequestParam String city,
            @RequestParam(required = false) String date) {

        LocalDateTime eventDate;
        if (date != null && !date.isEmpty()) {
            eventDate = LocalDateTime.parse(date + "T12:00:00");
        } else {
            eventDate = LocalDateTime.now();
        }

        return ResponseEntity.ok(weatherService.getWeatherByCity(city, eventDate));
    }

    // ─────────────────────────────────────────────────────────────────
    // CAPACITÉ
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/capacity")
    public ResponseEntity<EventCapacityResponse> getCapacity(@PathVariable Long id) {
        // À implémenter si nécessaire
        return ResponseEntity.ok(null);
    }

    // ─────────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────────

    private boolean isAdmin(Long userId) {
        com.elif.entities.user.User user = userService.findUser(userId);
        return user != null && user.getRole() == Role.ADMIN;
    }
    @PostMapping("/{eventId}/waitlist/promote")
    public ResponseEntity<Map<String, Boolean>> promoteNextFromWaitlist(
            @PathVariable Long eventId,
            @RequestParam(required = false) Long adminId) {

        // Vérifier les droits admin si adminId est fourni
        if (adminId != null && !isAdmin(adminId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        boolean promoted = waitlistService.promoteNext(eventId);
        return ResponseEntity.ok(Map.of("promoted", promoted));
    }
}