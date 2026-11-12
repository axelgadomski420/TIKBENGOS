package com.elif.controllers.adoption;

import com.elif.dto.adoption.request.AdoptionRequestRequestDTO;
import com.elif.dto.adoption.response.AdoptionRequestResponseDTO;
import com.elif.entities.adoption.AdoptionRequest;
import com.elif.entities.adoption.enums.RequestStatus;
import com.elif.services.adoption.interfaces.AdoptionRequestService;
import com.elif.services.adoption.interfaces.IAdoptionRequestScoringService;  // ✅ AJOUTER
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/adoption/requests")
@CrossOrigin(origins = "http://localhost:4200")
public class AdoptionRequestController {

    private final AdoptionRequestService requestService;
    private final IAdoptionRequestScoringService scoringService;  // ✅ AJOUTER

    // ============================================================
    // CONSTRUCTEUR MODIFIÉ
    // ============================================================

    public AdoptionRequestController(AdoptionRequestService requestService,
                                     IAdoptionRequestScoringService scoringService) {  // ✅ AJOUTER
        this.requestService = requestService;
        this.scoringService = scoringService;  // ✅ AJOUTER
    }

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    @GetMapping
    public ResponseEntity<List<AdoptionRequestResponseDTO>> getAllRequests() {
        List<AdoptionRequest> requests = requestService.findAll();
        List<AdoptionRequestResponseDTO> response = requests.stream()
                .map(this::toResponseDTOWithScore)  // ✅ Utiliser la nouvelle méthode
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdoptionRequestResponseDTO> getRequestById(@PathVariable Long id) {
        AdoptionRequest request = requestService.findById(id);
        return ResponseEntity.ok(toResponseDTOWithScore(request));  // ✅ Avec score
    }

    @GetMapping("/pet/{petId}")
    public ResponseEntity<List<AdoptionRequestResponseDTO>> getRequestsByPet(@PathVariable Long petId) {
        List<AdoptionRequest> requests = requestService.findByPetId(petId);
        List<AdoptionRequestResponseDTO> response = requests.stream()
                .map(this::toResponseDTOWithScore)  // ✅ Avec score
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/adopter/{adopterId}")
    public ResponseEntity<List<AdoptionRequestResponseDTO>> getRequestsByAdopter(@PathVariable Long adopterId) {
        List<AdoptionRequest> requests = requestService.findByAdopterId(adopterId);
        List<AdoptionRequestResponseDTO> response = requests.stream()
                .map(this::toResponseDTOWithScore)  // ✅ Avec score
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // ✅ MÉTHODE MODIFIÉE AVEC SCORES
    @GetMapping("/shelter/{shelterId}")
    public ResponseEntity<List<AdoptionRequestResponseDTO>> getRequestsByShelter(@PathVariable Long shelterId) {
        List<AdoptionRequest> requests = requestService.findByShelterId(shelterId);
        List<AdoptionRequestResponseDTO> response = requests.stream()
                .map(this::toResponseDTOWithScore)  // ✅ Avec score
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<AdoptionRequestResponseDTO>> getRequestsByStatus(@PathVariable RequestStatus status) {
        List<AdoptionRequest> requests = requestService.findByStatus(status);
        List<AdoptionRequestResponseDTO> response = requests.stream()
                .map(this::toResponseDTOWithScore)  // ✅ Avec score
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<AdoptionRequestResponseDTO> createRequest(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody AdoptionRequestRequestDTO request) {
        AdoptionRequest created = requestService.create(
                request.getPetId(),
                userId,
                request.getNotes(),
                request.getHousingType(),
                request.getHasGarden(),
                request.getHasChildren(),
                request.getOtherPets(),
                request.getExperienceLevel()
        );
        return new ResponseEntity<>(toResponseDTOWithScore(created), HttpStatus.CREATED);  // ✅ Avec score
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdoptionRequestResponseDTO> updateRequest(
            @PathVariable Long id,
            @RequestBody AdoptionRequestRequestDTO request) {
        AdoptionRequest updated = requestService.update(id, request.getNotes());
        return ResponseEntity.ok(toResponseDTOWithScore(updated));  // ✅ Avec score
    }

    // ============================================================
    // MÉTHODES DE GESTION DES STATUTS
    // ============================================================

    @PutMapping("/{id}/approve")
    public ResponseEntity<AdoptionRequestResponseDTO> approveRequest(@PathVariable Long id) {
        AdoptionRequest approved = requestService.approve(id);
        return ResponseEntity.ok(toResponseDTOWithScore(approved));  // ✅ Avec score
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<AdoptionRequestResponseDTO> rejectRequest(
            @PathVariable Long id,
            @RequestParam String reason) {
        AdoptionRequest rejected = requestService.reject(id, reason);
        return ResponseEntity.ok(toResponseDTOWithScore(rejected));  // ✅ Avec score
    }

    @PutMapping("/{id}/under-review")
    public ResponseEntity<AdoptionRequestResponseDTO> underReviewRequest(@PathVariable Long id) {
        AdoptionRequest underReview = requestService.underReview(id);
        return ResponseEntity.ok(toResponseDTOWithScore(underReview));  // ✅ Avec score
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<AdoptionRequestResponseDTO> cancelRequest(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        AdoptionRequest cancelled = requestService.cancel(id, userId);
        return ResponseEntity.ok(toResponseDTOWithScore(cancelled));  // ✅ Avec score
    }

    // ============================================================
    // MÉTHODES AVEC DÉTAILS
    // ============================================================

    @GetMapping("/adopter/{adopterId}/with-pet")
    public ResponseEntity<List<AdoptionRequestResponseDTO>> getRequestsByAdopterWithPet(@PathVariable Long adopterId) {
        List<AdoptionRequest> requests = requestService.findRequestsByAdopterWithPet(adopterId);
        List<AdoptionRequestResponseDTO> response = requests.stream()
                .map(this::toResponseDTOWithScore)  // ✅ Avec score
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/shelter/{shelterId}/with-pet")
    public ResponseEntity<List<AdoptionRequestResponseDTO>> getRequestsByShelterWithPet(@PathVariable Long shelterId) {
        List<AdoptionRequest> requests = requestService.findRequestsByShelterWithPet(shelterId);
        List<AdoptionRequestResponseDTO> response = requests.stream()
                .map(this::toResponseDTOWithScore)  // ✅ Avec score
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // MÉTHODES DE STATISTIQUES
    // ============================================================

    @GetMapping("/stats/pending/{shelterId}")
    public ResponseEntity<Long> countPendingRequestsByShelter(@PathVariable Long shelterId) {
        return ResponseEntity.ok(requestService.countPendingRequestsByShelterId(shelterId));
    }

    @GetMapping("/stats/top-adopters")
    public ResponseEntity<List<Object[]>> getTopAdopters(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(requestService.findTopAdopters(limit));
    }

    @GetMapping("/stats/most-requested")
    public ResponseEntity<List<Object[]>> getMostRequestedPets(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(requestService.findMostRequestedPets(limit));
    }

    // ============================================================
    // MÉTHODE DE CONVERSION SANS SCORE (existante)
    // ============================================================

    private AdoptionRequestResponseDTO toResponseDTO(AdoptionRequest request) {
        if (request == null) {
            return null;
        }

        String adopterName = "Utilisateur";
        if (request.getAdopter() != null) {
            adopterName = request.getAdopter().getFirstName() + " " + request.getAdopter().getLastName();
        }

        return AdoptionRequestResponseDTO.builder()
                .id(request.getId())
                .petId(request.getPet().getId())
                .petName(request.getPet().getName())
                .shelterId(request.getPet().getShelter().getId())
                .adopterId(request.getAdopter().getId())
                .adopterName(adopterName)
                .status(request.getStatus())
                .dateRequested(request.getDateRequested())
                .approvedDate(request.getApprovedDate())
                .notes(request.getNotes())
                .rejectionReason(request.getRejectionReason())
                .housingType(request.getHousingType())
                .hasGarden(request.getHasGarden())
                .hasChildren(request.getHasChildren())
                .otherPets(request.getOtherPets())
                .experienceLevel(request.getExperienceLevel())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    // ============================================================
    // ✅ NOUVELLE MÉTHODE DE CONVERSION AVEC SCORE
    // ============================================================

    private AdoptionRequestResponseDTO toResponseDTOWithScore(AdoptionRequest request) {
        if (request == null) {
            return null;
        }

        // D'abord créer le DTO de base
        AdoptionRequestResponseDTO dto = toResponseDTO(request);

        // ✅ Ajouter le score de compatibilité
        int score = scoringService.calculateScore(request);
        dto.setCompatibilityScore(score);
        dto.setCompatibilityLabel(scoringService.getScoreLabel(score));
        dto.setCompatibilityColor(scoringService.getScoreColor(score));
        dto.setScoreReasons(scoringService.getScoreReasons(request));

        return dto;
    }
}