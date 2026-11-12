package com.elif.services.adoption.interfaces;

import com.elif.entities.adoption.Contract;
import com.elif.entities.adoption.enums.ContractStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface ContractService {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    List<Contract> findAll();

    Contract findById(Long id);

    Contract findByNumeroContrat(String numeroContrat);

    List<Contract> findByShelterId(Long shelterId);

    List<Contract> findByAdoptantId(Long adoptantId);

    List<Contract> findByStatus(ContractStatus status);

    Contract findByAnimalId(Long animalId);

    Contract create(Long shelterId, Long adoptantId, Long animalId,
                    BigDecimal fraisAdoption, String conditionsSpecifiques);

    Contract sendForSignature(Long contractId);

    Contract sign(Long contractId, Long userId);

    Contract validate(Long contractId);

    Contract activate(Long contractId);

    Contract terminate(Long contractId);

    Contract rescind(Long contractId, Long userId);

    Contract cancel(Long contractId);

    Contract update(Long contractId, String conditionsSpecifiques, BigDecimal fraisAdoption);

    boolean hasContract(Long animalId);

    // ============================================================
    // GÉNÉRATION PDF
    // ============================================================

    byte[] generateContractPdf(Long contractId);

    // ============================================================
    // MÉTHODES POUR CONTRATS PAR TEMPS
    // ============================================================

    List<Contract> findContractsExpiringSoon(int days);

    List<Object[]> countContractsByMonthForShelter(Long shelterId);

    List<Contract> findContractsSignedToday();

    // ============================================================
    // MÉTHODES DE CHIFFRE D'AFFAIRES
    // ============================================================

    BigDecimal calculateTotalAdoptionFees();

    List<Object[]> calculateRevenueByShelter();

    BigDecimal calculateRevenueByShelterId(Long shelterId);

    // ============================================================
    // MÉTHODES POUR DOCUMENTS
    // ============================================================

    List<Contract> findContractsWithoutDocument();

    // ============================================================
    // MÉTHODES DE COMPTAGE PAR STATUT
    // ============================================================

    List<Object[]> countByStatus();

    long countByStatut(ContractStatus statut);

    // ============================================================
    // MÉTHODES POUR ADOPTANTS MULTIPLES
    // ============================================================

    List<Object[]> findMultipleAdopters(int minAdoptions);

    // ============================================================
    // MÉTHODES POUR STATISTIQUES PAR TYPE D'ANIMAL
    // ============================================================

    List<Object[]> countAdoptionsByPetType();

    List<Object[]> countAdoptionsByPetSize();

    List<Object[]> countAdoptionsByBreed();

    // ============================================================
    // MÉTHODES AVEC DÉTAILS (FETCH JOIN)
    // ============================================================

    List<Contract> findContractsByStatusWithDetails(ContractStatus status);

    List<Contract> findAllWithDetails();

    Contract findByIdWithDetails(Long id);

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    List<Contract> findByAdoptantIdAndStatut(Long adoptantId, ContractStatus statut);

    long countTotalAdoptions();

    List<Object[]> countAdoptionsByMonth();

    List<Contract> findByDateAdoptionBetween(LocalDateTime startDate, LocalDateTime endDate);
}