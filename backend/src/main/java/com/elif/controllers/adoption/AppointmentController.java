package com.elif.controllers.adoption;

import com.elif.entities.adoption.Appointment;
import com.elif.entities.adoption.AdoptionRequest;
import com.elif.services.adoption.impl.AdoptionRequestScoringService;
import com.elif.services.adoption.impl.AppointmentService;
import com.elif.services.adoption.interfaces.AdoptionRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/adoption")
@CrossOrigin(origins = "http://localhost:4200")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final AdoptionRequestService requestService;
    private final AdoptionRequestScoringService scoringService;

    public AppointmentController(AppointmentService appointmentService,
                                 AdoptionRequestService requestService,
                                 AdoptionRequestScoringService scoringService) {
        this.appointmentService = appointmentService;
        this.requestService     = requestService;
        this.scoringService     = scoringService;
    }

    // ============================================================
    // ✅ SCORER LES DEMANDES D'UN ANIMAL
    // GET /api/adoption/requests/pet/{petId}/scored
    // ============================================================

    @GetMapping("/requests/pet/{petId}/scored")
    public ResponseEntity<List<Map<String, Object>>> getScoredRequestsForPet(
            @PathVariable Long petId) {

        List<AdoptionRequest> requests = requestService.findByPetId(petId).stream()
                .filter(r -> r.getStatus().name().equals("PENDING") ||
                        r.getStatus().name().equals("UNDER_REVIEW"))
                .collect(Collectors.toList());

        List<Map<String, Object>> scored = requests.stream()
                .map(req -> {
                    int score = scoringService.calculateScore(req);
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id",             req.getId());
                    map.put("status",         req.getStatus());
                    map.put("dateRequested",  req.getDateRequested());
                    map.put("notes",          req.getNotes());
                    map.put("housingType",    req.getHousingType());
                    map.put("hasGarden",      req.getHasGarden());
                    map.put("hasChildren",    req.getHasChildren());
                    map.put("otherPets",      req.getOtherPets());
                    map.put("experienceLevel",req.getExperienceLevel());
                    map.put("adopterId",      req.getAdopter() != null ? req.getAdopter().getId() : null);
                    map.put("adopterName",    req.getAdopter() != null
                            ? req.getAdopter().getFirstName() + " " + req.getAdopter().getLastName()
                            : "Unknown");
                    map.put("adopterEmail",   req.getAdopter() != null ? req.getAdopter().getEmail() : null);
                    map.put("petId",          req.getPet() != null ? req.getPet().getId() : null);
                    map.put("petName",        req.getPet() != null ? req.getPet().getName() : null);
                    map.put("compatibilityScore", score);
                    map.put("scoreLabel",     scoringService.getScoreLabel(score));
                    map.put("scoreColor",     scoringService.getScoreColor(score));
                    map.put("scoreReasons",   scoringService.getScoreReasons(req));
                    return map;
                })
                // Trier par score décroissant
                .sorted((a, b) -> Integer.compare(
                        (int) b.get("compatibilityScore"),
                        (int) a.get("compatibilityScore")))
                .collect(Collectors.toList());

        return ResponseEntity.ok(scored);
    }

    // ============================================================
    // ✅ SCORER TOUTES LES DEMANDES D'UN SHELTER
    // GET /api/adoption/requests/shelter/{shelterId}/scored
    // ============================================================

    @GetMapping("/requests/shelter/{shelterId}/scored")
    public ResponseEntity<List<Map<String, Object>>> getScoredRequestsForShelter(
            @PathVariable Long shelterId) {

        List<AdoptionRequest> requests = requestService.findByShelterId(shelterId).stream()
                .filter(r -> r.getStatus().name().equals("PENDING") ||
                        r.getStatus().name().equals("UNDER_REVIEW"))
                .collect(Collectors.toList());

        List<Map<String, Object>> scored = buildScoredList(requests);
        return ResponseEntity.ok(scored);
    }

    // ============================================================
    // ✅ PLANIFIER UN RENDEZ-VOUS
    // POST /api/adoption/appointments
    // ============================================================

    @PostMapping("/appointments")
    public ResponseEntity<Appointment> scheduleAppointment(
            @RequestBody Map<String, Object> body) {

        Long requestId       = Long.valueOf(body.get("requestId").toString());
        String dateStr       = body.get("appointmentDate").toString();
        String shelterNotes  = body.containsKey("shelterNotes")
                ? body.get("shelterNotes").toString() : null;
        Integer score        = body.containsKey("compatibilityScore")
                ? Integer.valueOf(body.get("compatibilityScore").toString()) : null;

        LocalDateTime date = LocalDateTime.parse(dateStr);

        Appointment appointment = appointmentService.scheduleAppointment(
                requestId, date, shelterNotes, score);

        return new ResponseEntity<>(appointment, HttpStatus.CREATED);
    }

    // ============================================================
    // ✅ RÉPONDRE APRÈS CONSULTATION
    // PUT /api/adoption/appointments/{id}/respond
    // ============================================================

    @PutMapping("/appointments/{id}/respond")
    public ResponseEntity<Appointment> respondAfterConsultation(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String result  = body.get("result");          // APPROVED ou REJECTED
        String message = body.get("responseMessage");

        Appointment appointment = appointmentService.respondAfterConsultation(id, result, message);
        return ResponseEntity.ok(appointment);
    }

    // ============================================================
    // ✅ ANNULER UN RENDEZ-VOUS
    // PUT /api/adoption/appointments/{id}/cancel
    // ============================================================

    @PutMapping("/appointments/{id}/cancel")
    public ResponseEntity<Appointment> cancelAppointment(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "Cancelled by shelter");
        return ResponseEntity.ok(appointmentService.cancelAppointment(id, reason));
    }

    // ============================================================
    // ✅ RENDEZ-VOUS D'UN SHELTER
    // GET /api/adoption/appointments/shelter/{shelterId}
    // ============================================================

    @GetMapping("/appointments/shelter/{shelterId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByShelter(
            @PathVariable Long shelterId) {
        return ResponseEntity.ok(appointmentService.getByShelter(shelterId));
    }

    @GetMapping("/appointments/shelter/{shelterId}/upcoming")
    public ResponseEntity<List<Appointment>> getUpcomingAppointments(
            @PathVariable Long shelterId) {
        return ResponseEntity.ok(appointmentService.getUpcomingByShelter(shelterId));
    }

    // ============================================================
    // ✅ RENDEZ-VOUS D'UN ADOPTANT
    // GET /api/adoption/appointments/adopter/{adopterId}
    // ============================================================

    @GetMapping("/appointments/adopter/{adopterId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByAdopter(
            @PathVariable Long adopterId) {
        return ResponseEntity.ok(appointmentService.getByAdopter(adopterId));
    }

    // ============================================================
    // ✅ RENDEZ-VOUS PAR DEMANDE
    // GET /api/adoption/appointments/request/{requestId}
    // ============================================================

    @GetMapping("/appointments/request/{requestId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByRequest(
            @PathVariable Long requestId) {
        return ResponseEntity.ok(appointmentService.getByRequest(requestId));
    }

    // ============================================================
    // HELPER
    // ============================================================

    private List<Map<String, Object>> buildScoredList(List<AdoptionRequest> requests) {
        return requests.stream()
                .map(req -> {
                    int score = scoringService.calculateScore(req);
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id",              req.getId());
                    map.put("status",          req.getStatus());
                    map.put("dateRequested",   req.getDateRequested());
                    map.put("notes",           req.getNotes());
                    map.put("housingType",     req.getHousingType());
                    map.put("hasGarden",       req.getHasGarden());
                    map.put("hasChildren",     req.getHasChildren());
                    map.put("otherPets",       req.getOtherPets());
                    map.put("experienceLevel", req.getExperienceLevel());
                    map.put("adopterId",       req.getAdopter() != null ? req.getAdopter().getId() : null);
                    map.put("adopterName",     req.getAdopter() != null
                            ? req.getAdopter().getFirstName() + " " + req.getAdopter().getLastName()
                            : "Unknown");
                    map.put("adopterEmail",    req.getAdopter() != null ? req.getAdopter().getEmail() : null);
                    map.put("petId",           req.getPet() != null ? req.getPet().getId() : null);
                    map.put("petName",         req.getPet() != null ? req.getPet().getName() : null);
                    map.put("compatibilityScore", score);
                    map.put("scoreLabel",      scoringService.getScoreLabel(score));
                    map.put("scoreColor",      scoringService.getScoreColor(score));
                    map.put("scoreReasons",    scoringService.getScoreReasons(req));
                    return map;
                })
                .sorted((a, b) -> Integer.compare(
                        (int) b.get("compatibilityScore"),
                        (int) a.get("compatibilityScore")))
                .collect(Collectors.toList());
    }
}