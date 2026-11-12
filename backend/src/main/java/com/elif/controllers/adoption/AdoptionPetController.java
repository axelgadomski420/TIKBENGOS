package com.elif.controllers.adoption;

import com.elif.dto.adoption.request.AdoptionPetRequestDTO;
import com.elif.dto.adoption.request.PetSearchCriteriaDTO;
import com.elif.dto.adoption.response.AdoptionPetListDTO;
import com.elif.dto.adoption.response.AdoptionPetResponseDTO;
import com.elif.dto.adoption.response.PetSuggestionDTO;
import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetSize;
import com.elif.services.adoption.interfaces.PetSuggestionService;  // ✅ CORRECT
import com.elif.services.adoption.interfaces.AdoptionPetService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/adoption/pets")
@CrossOrigin(origins = "http://localhost:4200")
public class AdoptionPetController {

    private final AdoptionPetService petService;
    private final PetSuggestionService suggestionService; // ✅ NOUVEAU

    // ============================================================
    // CONSTRUCTEUR
    // ============================================================

    public AdoptionPetController(AdoptionPetService petService,
                                 PetSuggestionService suggestionService) {
        this.petService       = petService;
        this.suggestionService = suggestionService;
    }

    // ============================================================
    // MÉTHODES DE BASE CRUD (inchangées)
    // ============================================================

    @GetMapping
    public ResponseEntity<List<AdoptionPetResponseDTO>> getAllPets() {
        return ResponseEntity.ok(petService.findAll().stream()
                .map(this::toResponseDTO).collect(Collectors.toList()));
    }

    @GetMapping("/available")
    public ResponseEntity<List<AdoptionPetResponseDTO>> getAvailablePets() {
        return ResponseEntity.ok(petService.findAvailable().stream()
                .map(this::toResponseDTO).collect(Collectors.toList()));
    }

    @GetMapping("/list")
    public ResponseEntity<List<AdoptionPetListDTO>> getPetsList() {
        return ResponseEntity.ok(petService.findAvailable().stream()
                .map(this::toListDTO).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdoptionPetResponseDTO> getPetById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponseDTO(petService.findById(id)));
    }

    @GetMapping("/shelter/{shelterId}")
    public ResponseEntity<List<AdoptionPetResponseDTO>> getPetsByShelter(@PathVariable Long shelterId) {
        return ResponseEntity.ok(petService.findByShelterId(shelterId).stream()
                .map(this::toResponseDTO).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<AdoptionPetResponseDTO> createPet(
            @RequestBody AdoptionPetRequestDTO request,
            @RequestParam Long shelterId) {
        AdoptionPet pet = toEntity(request);
        AdoptionPet created = petService.create(pet, shelterId);
        return new ResponseEntity<>(toResponseDTO(created), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdoptionPetResponseDTO> updatePet(
            @PathVariable Long id,
            @RequestBody AdoptionPetRequestDTO request) {
        AdoptionPet pet = toEntity(request);
        return ResponseEntity.ok(toResponseDTO(petService.update(id, pet)));
    }

    @PutMapping("/{id}/adopt")
    public ResponseEntity<AdoptionPetResponseDTO> markAsAdopted(@PathVariable Long id) {
        return ResponseEntity.ok(toResponseDTO(petService.markAsAdopted(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePet(@PathVariable Long id) {
        petService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // MÉTHODES DE RECHERCHE ET FILTRAGE (inchangées)
    // ============================================================

    @GetMapping("/type/{type}")
    public ResponseEntity<List<AdoptionPetResponseDTO>> getPetsByType(@PathVariable AdoptionPetType type) {
        return ResponseEntity.ok(petService.findAvailableByType(type).stream()
                .map(this::toResponseDTO).collect(Collectors.toList()));
    }

    @GetMapping("/size/{size}")
    public ResponseEntity<List<AdoptionPetResponseDTO>> getPetsBySize(@PathVariable AdoptionPetSize size) {
        return ResponseEntity.ok(petService.findAvailableBySize(size).stream()
                .map(this::toResponseDTO).collect(Collectors.toList()));
    }

    @GetMapping("/breed/{breed}")
    public ResponseEntity<List<AdoptionPetResponseDTO>> getPetsByBreed(@PathVariable String breed) {
        return ResponseEntity.ok(petService.findByBreed(breed).stream()
                .map(this::toResponseDTO).collect(Collectors.toList()));
    }

    @GetMapping("/search")
    public ResponseEntity<List<AdoptionPetResponseDTO>> advancedSearch(
            @RequestParam(required = false) AdoptionPetType type,
            @RequestParam(required = false) String breed,
            @RequestParam(required = false) Integer minAge,
            @RequestParam(required = false) Integer maxAge,
            @RequestParam(required = false) AdoptionPetSize size,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) Boolean spayedNeutered) {
        return ResponseEntity.ok(petService.advancedSearch(type, breed, minAge, maxAge, size, gender, spayedNeutered)
                .stream().map(this::toResponseDTO).collect(Collectors.toList()));
    }

    // ============================================================
    // ✅ NOUVEAU : ENDPOINT SUGGESTIONS (wizard)
    // POST /api/adoption/pets/suggestions
    // ============================================================

    @PostMapping("/suggestions")
    public ResponseEntity<List<PetSuggestionDTO>> getSuggestions(
            @RequestBody PetSearchCriteriaDTO criteria) {
        List<PetSuggestionDTO> suggestions = suggestionService.getSuggestions(criteria);
        return ResponseEntity.ok(suggestions);
    }

    // ============================================================
    // MÉTHODES DE RECOMMANDATION (inchangées)
    // ============================================================

    @GetMapping("/{id}/similar")
    public ResponseEntity<List<AdoptionPetResponseDTO>> getSimilarPets(
            @PathVariable Long id,
            @RequestParam(defaultValue = "5") Long limit) {
        return ResponseEntity.ok(petService.findSimilarPets(id, limit).stream()
                .map(this::toResponseDTO).collect(Collectors.toList()));
    }

    @GetMapping("/urgent")
    public ResponseEntity<List<AdoptionPetResponseDTO>> getUrgentPets() {
        return ResponseEntity.ok(petService.findUrgentPets().stream()
                .map(this::toResponseDTO).collect(Collectors.toList()));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<AdoptionPetResponseDTO>> getRecentlyAdded(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(petService.findRecentlyAdded(limit, days).stream()
                .map(this::toResponseDTO).collect(Collectors.toList()));
    }

    // ============================================================
    // MÉTHODES DE STATISTIQUES (inchangées)
    // ============================================================

    @GetMapping("/count/available")
    public ResponseEntity<Long> countAvailable() {
        return ResponseEntity.ok(petService.countAvailable());
    }

    @GetMapping("/stats/by-type")
    public ResponseEntity<List<Object[]>> getCountByType() {
        return ResponseEntity.ok(petService.countByType());
    }

    @GetMapping("/stats/by-size")
    public ResponseEntity<List<Object[]>> getCountBySize() {
        return ResponseEntity.ok(petService.countBySize());
    }

    @GetMapping("/stats/most-requested")
    public ResponseEntity<List<Object[]>> getMostRequestedPets(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(petService.findMostRequestedPets(limit));
    }

    // ============================================================
    // MÉTHODES DE CONVERSION (inchangées)
    // ============================================================

    private AdoptionPetResponseDTO toResponseDTO(AdoptionPet pet) {
        if (pet == null) return null;
        return AdoptionPetResponseDTO.builder()
                .id(pet.getId())
                .name(pet.getName())
                .type(pet.getType())
                .breed(pet.getBreed())
                .age(pet.getAge())
                .gender(pet.getGender())
                .size(pet.getSize())
                .color(pet.getColor())
                .healthStatus(pet.getHealthStatus())
                .spayedNeutered(pet.getSpayedNeutered())
                .specialNeeds(pet.getSpecialNeeds())
                .description(pet.getDescription())
                .photos(pet.getPhotos())
                .available(pet.getAvailable())
                .shelterId(pet.getShelter() != null ? pet.getShelter().getId() : null)
                .shelterName(pet.getShelter() != null ? pet.getShelter().getName() : null)
                .createdAt(pet.getCreatedAt())
                .adoptedAt(pet.getAdoptedAt())
                .build();
    }

    private AdoptionPetListDTO toListDTO(AdoptionPet pet) {
        if (pet == null) return null;
        return AdoptionPetListDTO.builder()
                .id(pet.getId())
                .name(pet.getName())
                .type(pet.getType())
                .breed(pet.getBreed())
                .age(pet.getAge())
                .size(pet.getSize())
                .shelterId(pet.getShelter() != null ? pet.getShelter().getId() : null)
                .shelterName(pet.getShelter() != null ? pet.getShelter().getName() : null)
                .build();
    }

    private AdoptionPet toEntity(AdoptionPetRequestDTO dto) {
        AdoptionPet pet = new AdoptionPet();
        pet.setName(dto.getName());
        pet.setType(dto.getType());
        pet.setBreed(dto.getBreed());
        pet.setAge(dto.getAge());
        pet.setGender(dto.getGender());
        pet.setSize(dto.getSize());
        pet.setColor(dto.getColor());
        pet.setHealthStatus(dto.getHealthStatus());
        pet.setSpayedNeutered(dto.getSpayedNeutered());
        pet.setSpecialNeeds(dto.getSpecialNeeds());
        pet.setDescription(dto.getDescription());
        pet.setPhotos(dto.getPhotos());
        return pet;
    }
}