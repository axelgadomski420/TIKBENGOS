package com.elif.repositories.adoption;

import com.elif.entities.adoption.Contract;
import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    Optional<Contract> findByNumeroContrat(String numeroContrat);

    List<Contract> findByShelterId(Long shelterId);

    List<Contract> findByAdoptantId(Long adoptantId);

    List<Contract> findByStatut(ContractStatus statut);

    Optional<Contract> findByAnimalId(Long animalId);

    @Query("SELECT c FROM Contract c WHERE c.adoptant.id = :userId AND c.statut = :statut")
    List<Contract> findByUserIdAndStatus(@Param("userId") Long userId, @Param("statut") ContractStatus statut);

    boolean existsByAnimalId(Long animalId);

    // ============================================================
    // MÉTHODES POUR CONTRATS PAR TEMPS
    // ============================================================

    /**
     * Trouver les contrats qui expirent bientôt
     * @param days Nombre de jours avant expiration
     * @return Liste des contrats qui expirent dans moins de X jours
     */
    @Query("SELECT c FROM Contract c WHERE c.statut = 'ACTIF' " +
            "AND c.dateAdoption <= CURRENT_TIMESTAMP - :days DAY")
    List<Contract> findContractsExpiringSoon(@Param("days") int days);

    /**
     * Compter les contrats par mois pour un refuge
     * @param shelterId ID du refuge
     * @return Liste d'objets [year, month, count]
     */
    @Query("SELECT YEAR(c.dateAdoption), MONTH(c.dateAdoption), COUNT(c) " +
            "FROM Contract c WHERE c.shelter.id = :shelterId " +
            "GROUP BY YEAR(c.dateAdoption), MONTH(c.dateAdoption) " +
            "ORDER BY YEAR(c.dateAdoption) DESC, MONTH(c.dateAdoption) DESC")
    List<Object[]> countContractsByMonthForShelter(@Param("shelterId") Long shelterId);

    /**
     * Trouver les contrats signés aujourd'hui
     * @return Liste des contrats signés aujourd'hui
     */
    @Query("SELECT c FROM Contract c WHERE DATE(c.dateSignature) = CURRENT_DATE")
    List<Contract> findContractsSignedToday();

    // ============================================================
    // MÉTHODES DE CHIFFRE D'AFFAIRES
    // ============================================================

    /**
     * Calculer le chiffre d'affaires total des frais d'adoption
     * @return Total des frais d'adoption
     */
    @Query("SELECT SUM(c.fraisAdoption) FROM Contract c WHERE c.statut IN ('SIGNE', 'VALIDE', 'ACTIF', 'TERMINE')")
    BigDecimal calculateTotalAdoptionFees();

    /**
     * Calculer le chiffre d'affaires par refuge
     * @return Liste d'objets [shelterId, revenue]
     */
    @Query("SELECT c.shelter.id, SUM(c.fraisAdoption) FROM Contract c " +
            "WHERE c.statut IN ('SIGNE', 'VALIDE', 'ACTIF', 'TERMINE') " +
            "GROUP BY c.shelter.id")
    List<Object[]> calculateRevenueByShelter();

    /**
     * Calculer le chiffre d'affaires pour un refuge spécifique
     * @param shelterId ID du refuge
     * @return Chiffre d'affaires du refuge
     */
    @Query("SELECT SUM(c.fraisAdoption) FROM Contract c " +
            "WHERE c.shelter.id = :shelterId AND c.statut IN ('SIGNE', 'VALIDE', 'ACTIF', 'TERMINE')")
    BigDecimal calculateRevenueByShelterId(@Param("shelterId") Long shelterId);

    // ============================================================
    // MÉTHODES POUR DOCUMENTS
    // ============================================================

    /**
     * Trouver les contrats sans document uploadé
     * @return Liste des contrats sans document
     */
    @Query("SELECT c FROM Contract c WHERE c.documentUrl IS NULL OR c.documentUrl = ''")
    List<Contract> findContractsWithoutDocument();

    // ============================================================
    // MÉTHODES DE COMPTAGE PAR STATUT
    // ============================================================

    /**
     * Compter les contrats par statut
     * @return Liste d'objets [statut, count]
     */
    @Query("SELECT c.statut, COUNT(c) FROM Contract c GROUP BY c.statut")
    List<Object[]> countByStatus();

    /**
     * Compter les contrats actifs
     * @return Nombre de contrats actifs
     */
    long countByStatut(ContractStatus statut);

    // ============================================================
    // MÉTHODES POUR ADOPTANTS MULTIPLES
    // ============================================================

    /**
     * Trouver les adoptants qui ont adopté plusieurs animaux
     * @param minAdoptions Nombre minimum d'adoptions
     * @return Liste d'objets [adoptantId, adoptantName, adoptionCount]
     */
    @Query("SELECT c.adoptant.id, CONCAT(c.adoptant.firstName, ' ', c.adoptant.lastName), COUNT(c) " +
            "FROM Contract c GROUP BY c.adoptant.id HAVING COUNT(c) >= :minAdoptions " +
            "ORDER BY COUNT(c) DESC")
    List<Object[]> findMultipleAdopters(@Param("minAdoptions") int minAdoptions);

    // ============================================================
    // MÉTHODES POUR STATISTIQUES PAR TYPE D'ANIMAL
    // ============================================================

    /**
     * Compter les adoptions par type d'animal
     * @return Map avec type d'animal comme clé et nombre comme valeur
     */
    @Query("SELECT p.type, COUNT(c) FROM Contract c JOIN c.animal p GROUP BY p.type")
    List<Object[]> countAdoptionsByPetType();

    /**
     * Compter les adoptions par taille d'animal
     * @return Liste d'objets [size, count]
     */
    @Query("SELECT p.size, COUNT(c) FROM Contract c JOIN c.animal p GROUP BY p.size")
    List<Object[]> countAdoptionsByPetSize();

    /**
     * Compter les adoptions par race
     * @return Liste d'objets [breed, count]
     */
    @Query("SELECT p.breed, COUNT(c) FROM Contract c JOIN c.animal p WHERE p.breed IS NOT NULL GROUP BY p.breed")
    List<Object[]> countAdoptionsByBreed();

    // ============================================================
    // MÉTHODES AVEC DÉTAILS (FETCH JOIN)
    // ============================================================

    /**
     * Trouver les contrats avec leurs détails complets
     * @param status Statut du contrat
     * @return Liste des contrats avec refuge, adoptant et animal chargés
     */
    @Query("SELECT c FROM Contract c JOIN FETCH c.shelter JOIN FETCH c.adoptant JOIN FETCH c.animal WHERE c.statut = :status")
    List<Contract> findContractsByStatusWithDetails(@Param("status") ContractStatus status);

    /**
     * Trouver tous les contrats avec leurs détails complets
     * @return Liste des contrats avec refuge, adoptant et animal chargés
     */
    @Query("SELECT c FROM Contract c JOIN FETCH c.shelter JOIN FETCH c.adoptant JOIN FETCH c.animal")
    List<Contract> findAllWithDetails();

    /**
     * Trouver un contrat par ID avec détails complets
     * @param id ID du contrat
     * @return Contrat avec refuge, adoptant et animal chargés
     */
    @Query("SELECT c FROM Contract c JOIN FETCH c.shelter JOIN FETCH c.adoptant JOIN FETCH c.animal WHERE c.id = :id")
    Optional<Contract> findByIdWithDetails(@Param("id") Long id);

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    /**
     * Trouver les contrats actifs d'un adoptant
     * @param adoptantId ID de l'adoptant
     * @return Liste des contrats actifs
     */
    List<Contract> findByAdoptantIdAndStatut(Long adoptantId, ContractStatus statut);

    /**
     * Compter le nombre total d'animaux adoptés
     * @return Nombre total d'adoptions
     */
    @Query("SELECT COUNT(c) FROM Contract c")
    long countTotalAdoptions();

    /**
     * Compter le nombre d'adoptions par mois
     * @return Liste d'objets [year, month, count]
     */
    @Query("SELECT YEAR(c.dateAdoption), MONTH(c.dateAdoption), COUNT(c) FROM Contract c " +
            "GROUP BY YEAR(c.dateAdoption), MONTH(c.dateAdoption) " +
            "ORDER BY YEAR(c.dateAdoption) DESC, MONTH(c.dateAdoption) DESC")
    List<Object[]> countAdoptionsByMonth();

    /**
     * Trouver les contrats d'une période donnée
     * @param startDate Date de début
     * @param endDate Date de fin
     * @return Liste des contrats
     */
    List<Contract> findByDateAdoptionBetween(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);

    /**
     * Calculer la somme totale des frais d'adoption
     */
    @Query("SELECT SUM(c.fraisAdoption) FROM Contract c")
    BigDecimal sumFraisAdoption();
}