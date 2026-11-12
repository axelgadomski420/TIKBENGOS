package com.elif.services.adoption.interfaces;

import com.elif.dto.adoption.response.AdminStatisticsResponseDTO;
import com.elif.dto.adoption.response.ShelterAdminDTO;
import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.AdoptionRequest;
import com.elif.entities.adoption.Contract;
import com.elif.entities.adoption.enums.ContractStatus;
import com.elif.entities.adoption.enums.RequestStatus;

import java.util.List;

public interface IAdminService {

    // ============================================================
    // STATISTIQUES
    // ============================================================

    AdminStatisticsResponseDTO getStatistics();

    // ============================================================
    // GESTION DES REFUGES
    // ============================================================

    List<ShelterAdminDTO> getAllShelters();
    ShelterAdminDTO getShelterById(Long id);
    ShelterAdminDTO createShelter(ShelterAdminDTO shelter);
    ShelterAdminDTO updateShelter(Long id, ShelterAdminDTO shelter);
    void deleteShelter(Long id);

    // ============================================================
    // GESTION DES ANIMAUX
    // ============================================================

    List<AdoptionPet> getAllPets();
    AdoptionPet getPetById(Long id);
    AdoptionPet createPet(AdoptionPet pet);
    AdoptionPet updatePet(Long id, AdoptionPet pet);
    void deletePet(Long id);

    // ============================================================
    // GESTION DES DEMANDES (REQUESTS)
    // ============================================================

    List<AdoptionRequest> getAllRequests();
    AdoptionRequest getRequestById(Long id);
    AdoptionRequest updateRequestStatus(Long id, RequestStatus status, String rejectionReason);
    void deleteRequest(Long id);

    // ============================================================
    // GESTION DES CONTRATS
    // ============================================================

    List<Contract> getAllContracts();
    Contract getContractById(Long id);
    Contract updateContractStatus(Long id, ContractStatus status);
    void deleteContract(Long id);
    byte[] generateContractPdf(Long id);
}