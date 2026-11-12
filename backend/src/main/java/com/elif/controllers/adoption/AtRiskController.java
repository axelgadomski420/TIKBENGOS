package com.elif.controllers.adoption;

import com.elif.dto.adoption.response.AtRiskPetDTO;
import com.elif.services.adoption.impl.AtRiskPetScoringService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/adoption/at-risk")
@CrossOrigin(origins = "http://localhost:4200")
public class AtRiskController {

    private final AtRiskPetScoringService scoringService;

    public AtRiskController(AtRiskPetScoringService scoringService) {
        this.scoringService = scoringService;
    }

    @GetMapping
    public ResponseEntity<List<AtRiskPetDTO>> getAllAtRisk() {
        return ResponseEntity.ok(scoringService.analyzeAllAvailablePets());
    }

    @GetMapping("/critical")
    public ResponseEntity<List<AtRiskPetDTO>> getCritical() {
        return ResponseEntity.ok(scoringService.getCriticalOnly());
    }

    @GetMapping("/shelter/{shelterId}")
    public ResponseEntity<List<AtRiskPetDTO>> getByShelter(@PathVariable Long shelterId) {
        return ResponseEntity.ok(scoringService.analyzeByShelterId(shelterId));
    }

    @GetMapping("/pet/{petId}")
    public ResponseEntity<AtRiskPetDTO> analyzePet(@PathVariable Long petId) {
        return ResponseEntity.ok(scoringService.analyzeAllAvailablePets()
                .stream()
                .filter(d -> d.getPetId().equals(petId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Pet not found or already adopted")));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(scoringService.getGlobalStats());
    }
}