package com.elif.controllers.adoption;

import com.elif.dto.adoption.response.AdminStatisticsResponseDTO;
import com.elif.dto.adoption.response.ShelterAdminDTO;
import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.AdoptionRequest;
import com.elif.entities.adoption.Contract;
import com.elif.entities.adoption.enums.ContractStatus;
import com.elif.entities.adoption.enums.RequestStatus;
import com.elif.services.adoption.interfaces.IAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class AdminController {

    private final IAdminService adminService;

    // ============================================================
    // STATISTIQUES
    // ============================================================

    @GetMapping("/statistics")
    public ResponseEntity<AdminStatisticsResponseDTO> getStatistics() {
        return ResponseEntity.ok(adminService.getStatistics());
    }

    // ============================================================
    // GESTION DES REFUGES
    // ============================================================

    @GetMapping("/shelters")
    public ResponseEntity<List<ShelterAdminDTO>> getAllShelters() {
        return ResponseEntity.ok(adminService.getAllShelters());
    }

    @GetMapping("/shelters/{id}")
    public ResponseEntity<ShelterAdminDTO> getShelterById(@PathVariable Long id) {
        ShelterAdminDTO shelter = adminService.getShelterById(id);
        return ResponseEntity.ok(shelter);
    }

    @PostMapping("/shelters")
    public ResponseEntity<ShelterAdminDTO> createShelter(@RequestBody ShelterAdminDTO shelter) {
        ShelterAdminDTO created = adminService.createShelter(shelter);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/shelters/{id}")
    public ResponseEntity<ShelterAdminDTO> updateShelter(@PathVariable Long id, @RequestBody ShelterAdminDTO shelter) {
        ShelterAdminDTO updated = adminService.updateShelter(id, shelter);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/shelters/{id}")
    public ResponseEntity<Void> deleteShelter(@PathVariable Long id) {
        adminService.deleteShelter(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // GESTION DES ANIMAUX
    // ============================================================

    @GetMapping("/pets")
    public ResponseEntity<List<AdoptionPet>> getAllPets() {
        return ResponseEntity.ok(adminService.getAllPets());
    }

    @GetMapping("/pets/{id}")
    public ResponseEntity<AdoptionPet> getPetById(@PathVariable Long id) {
        AdoptionPet pet = adminService.getPetById(id);
        return ResponseEntity.ok(pet);
    }

    @PostMapping("/pets")
    public ResponseEntity<AdoptionPet> createPet(@RequestBody AdoptionPet pet) {
        AdoptionPet created = adminService.createPet(pet);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/pets/{id}")
    public ResponseEntity<AdoptionPet> updatePet(@PathVariable Long id, @RequestBody AdoptionPet pet) {
        AdoptionPet updated = adminService.updatePet(id, pet);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/pets/{id}")
    public ResponseEntity<Void> deletePet(@PathVariable Long id) {
        adminService.deletePet(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // GESTION DES DEMANDES (REQUESTS)
    // ============================================================

    @GetMapping("/requests")
    public ResponseEntity<List<AdoptionRequest>> getAllRequests() {
        return ResponseEntity.ok(adminService.getAllRequests());
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<AdoptionRequest> getRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getRequestById(id));
    }

    @PutMapping("/requests/{id}/status")
    public ResponseEntity<AdoptionRequest> updateRequestStatus(
            @PathVariable Long id,
            @RequestParam RequestStatus status,
            @RequestParam(required = false) String rejectionReason) {
        AdoptionRequest updated = adminService.updateRequestStatus(id, status, rejectionReason);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/requests/{id}")
    public ResponseEntity<Void> deleteRequest(@PathVariable Long id) {
        adminService.deleteRequest(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // GESTION DES CONTRATS
    // ============================================================

    @GetMapping("/contracts")
    public ResponseEntity<List<Contract>> getAllContracts() {
        return ResponseEntity.ok(adminService.getAllContracts());
    }

    @GetMapping("/contracts/{id}")
    public ResponseEntity<Contract> getContractById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getContractById(id));
    }

    @PutMapping("/contracts/{id}/status")
    public ResponseEntity<Contract> updateContractStatus(
            @PathVariable Long id,
            @RequestParam ContractStatus status) {
        Contract updated = adminService.updateContractStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/contracts/{id}")
    public ResponseEntity<Void> deleteContract(@PathVariable Long id) {
        adminService.deleteContract(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/contracts/{id}/pdf")
    public ResponseEntity<byte[]> downloadContractPdf(@PathVariable Long id) {
        byte[] pdf = adminService.generateContractPdf(id);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=\"contract-" + id + ".pdf\"")
                .body(pdf);
    }
}