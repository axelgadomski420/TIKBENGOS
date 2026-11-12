package com.elif.controllers.adoption;

import com.elif.dto.adoption.request.ShelterRequestDTO;
import com.elif.dto.adoption.response.ShelterListDTO;
import com.elif.dto.adoption.response.ShelterResponseDTO;
import com.elif.entities.adoption.Shelter;
import com.elif.services.adoption.interfaces.ShelterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/adoption/shelters")
@CrossOrigin(origins = "http://localhost:4200")
public class ShelterController {

    private final ShelterService shelterService;

    // ============================================================
    // CONSTRUCTEUR
    // ============================================================

    public ShelterController(ShelterService shelterService) {
        this.shelterService = shelterService;
    }

    // ============================================================
    // MÉTHODES DE BASE CRUD
    // ============================================================

    @GetMapping
    public ResponseEntity<List<ShelterResponseDTO>> getAllShelters() {
        List<Shelter> shelters = shelterService.findAll();
        List<ShelterResponseDTO> response = shelters.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
    @GetMapping("/user/{userId}")
    public ResponseEntity<ShelterResponseDTO> getShelterByUserId(@PathVariable Long userId) {
        Shelter shelter = shelterService.findByUserId(userId);
        return ResponseEntity.ok(toResponseDTO(shelter));
    }
    @GetMapping("/list")
    public ResponseEntity<List<ShelterListDTO>> getAllSheltersList() {
        List<Shelter> shelters = shelterService.findAll();
        List<ShelterListDTO> response = shelters.stream()
                .map(this::toListDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShelterResponseDTO> getShelterById(@PathVariable Long id) {
        Shelter shelter = shelterService.findById(id);
        return ResponseEntity.ok(toResponseDTO(shelter));
    }

    @GetMapping("/verified")
    public ResponseEntity<List<ShelterResponseDTO>> getVerifiedShelters() {
        List<Shelter> shelters = shelterService.findVerified();
        List<ShelterResponseDTO> response = shelters.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<ShelterResponseDTO> getShelterByEmail(@PathVariable String email) {
        Shelter shelter = shelterService.findByEmail(email);
        return ResponseEntity.ok(toResponseDTO(shelter));
    }

    @PostMapping
    public ResponseEntity<ShelterResponseDTO> createShelter(@RequestBody ShelterRequestDTO request) {
        Shelter shelter = toEntity(request);
        Shelter created = shelterService.create(shelter);
        return new ResponseEntity<>(toResponseDTO(created), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShelterResponseDTO> updateShelter(
            @PathVariable Long id,
            @RequestBody ShelterRequestDTO request) {
        Shelter shelter = toEntity(request);
        Shelter updated = shelterService.update(id, shelter);
        return ResponseEntity.ok(toResponseDTO(updated));
    }

    @PutMapping("/{id}/verify")
    public ResponseEntity<ShelterResponseDTO> verifyShelter(@PathVariable Long id) {
        Shelter verified = shelterService.verifyShelter(id);
        return ResponseEntity.ok(toResponseDTO(verified));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShelter(@PathVariable Long id) {
        shelterService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // MÉTHODES PAR LOCALISATION
    // ============================================================

    @GetMapping("/city/{city}")
    public ResponseEntity<List<ShelterResponseDTO>> getSheltersByCity(@PathVariable String city) {
        List<Shelter> shelters = shelterService.findByCity(city);
        List<ShelterResponseDTO> response = shelters.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/region/{region}")
    public ResponseEntity<List<ShelterResponseDTO>> getSheltersByRegion(@PathVariable String region) {
        List<Shelter> shelters = shelterService.findByRegion(region);
        List<ShelterResponseDTO> response = shelters.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<ShelterResponseDTO>> getNearbyShelters(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "10") double radiusKm) {
        List<Shelter> shelters = shelterService.findNearby(latitude, longitude, radiusKm);
        List<ShelterResponseDTO> response = shelters.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // MÉTHODES DE RECHERCHE
    // ============================================================

    @GetMapping("/search")
    public ResponseEntity<List<ShelterResponseDTO>> searchShelters(@RequestParam String keyword) {
        List<Shelter> shelters = shelterService.searchShelters(keyword);
        List<ShelterResponseDTO> response = shelters.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // MÉTHODES DE STATISTIQUES
    // ============================================================

    @GetMapping("/stats/top-adoptions")
    public ResponseEntity<List<Object[]>> getTopSheltersByAdoptions(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(shelterService.findTopSheltersByAdoptions(limit));
    }

    @GetMapping("/stats/top-pets")
    public ResponseEntity<List<Object[]>> getTopSheltersByAvailablePets(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(shelterService.findTopSheltersByAvailablePets(limit));
    }

    @GetMapping("/count/verified")
    public ResponseEntity<Long> countVerifiedShelters() {
        return ResponseEntity.ok(shelterService.countVerified());
    }

    // ============================================================
    // MÉTHODES DE CONVERSION
    // ============================================================

    private ShelterResponseDTO toResponseDTO(Shelter shelter) {
        if (shelter == null) {
            return null;
        }
        return ShelterResponseDTO.builder()
                .id(shelter.getId())
                .name(shelter.getName())
                .address(shelter.getAddress())
                .phone(shelter.getPhone())
                .email(shelter.getEmail())
                .licenseNumber(shelter.getLicenseNumber())
                .verified(shelter.getVerified())
                .description(shelter.getDescription())
                .logoUrl(shelter.getLogoUrl())
                .createdAt(shelter.getCreatedAt())
                .updatedAt(shelter.getUpdatedAt())
                .build();
    }

    private ShelterListDTO toListDTO(Shelter shelter) {
        if (shelter == null) {
            return null;
        }
        return ShelterListDTO.builder()
                .id(shelter.getId())
                .name(shelter.getName())
                .logoUrl(shelter.getLogoUrl())
                .verified(shelter.getVerified())
                .build();
    }

    private Shelter toEntity(ShelterRequestDTO dto) {
        Shelter shelter = new Shelter();
        shelter.setName(dto.getName());
        shelter.setAddress(dto.getAddress());
        shelter.setPhone(dto.getPhone());
        shelter.setEmail(dto.getEmail());
        shelter.setLicenseNumber(dto.getLicenseNumber());
        shelter.setDescription(dto.getDescription());
        shelter.setLogoUrl(dto.getLogoUrl());
        return shelter;
    }
}