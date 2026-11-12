package com.elif.controllers.events;

import com.elif.dto.events.request.EventAnalysisRequestDTO;
import com.elif.dto.events.response.EventAnalysisResponseDTO;
import com.elif.services.events.implementations.EventIntelligenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events/intelligence")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class EventIntelligenceController {

    private final EventIntelligenceService service;

    /**
     * POST /api/events/intelligence/coach
     *
     * Analyse un événement en cours de création et retourne :
     *   - score global (0–100)
     *   - prédiction présence + engagement
     *   - analyse narrative
     *   - recommandations actionnables triées par priorité
     */
    @PostMapping("/coach")
    public ResponseEntity<EventAnalysisResponseDTO> analyze(
            @Valid @RequestBody EventAnalysisRequestDTO request) {
        log.info("🧠 Event coach analysis for: '{}'", request.getTitle());
        return ResponseEntity.ok(service.analyze(request));
    }
}