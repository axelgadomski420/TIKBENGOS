package com.elif.repositories.adoption;

import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetSize;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdoptionPetRepository extends JpaRepository<AdoptionPet, Long> {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    List<AdoptionPet> findByAvailableTrue();

    List<AdoptionPet> findByShelterId(Long shelterId);

    List<AdoptionPet> findByType(AdoptionPetType type);

    List<AdoptionPet> findBySize(AdoptionPetSize size);

    List<AdoptionPet> findByBreedContainingIgnoreCase(String breed);

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true AND p.type = :type")
    List<AdoptionPet> findAvailableByType(@Param("type") AdoptionPetType type);

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true AND p.size = :size")
    List<AdoptionPet> findAvailableBySize(@Param("size") AdoptionPetSize size);

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true AND p.age <= :maxAge")
    List<AdoptionPet> findAvailableByAgeLessThanEqual(@Param("maxAge") Integer maxAge);

    // ============================================================
    // MÉTHODES DE RECOMMANDATION ET SIMILARITÉ
    // ============================================================

    @Query(value = "SELECT * FROM adoption_pet p WHERE p.available = true AND p.id != :petId " +
            "AND p.type = (SELECT type FROM adoption_pet WHERE id = :petId) " +
            "ORDER BY ABS(p.age - (SELECT age FROM adoption_pet WHERE id = :petId)) " +
            "LIMIT :limit", nativeQuery = true)
    List<AdoptionPet> findSimilarPets(@Param("petId") Long petId, @Param("limit") Long limit);

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true " +
            "AND (:type IS NULL OR p.type = :type) " +
            "AND (:size IS NULL OR p.size = :size) " +
            "ORDER BY p.createdAt DESC")
    List<AdoptionPet> recommendPetsByUserPreferences(@Param("userId") Long userId,
                                                     @Param("type") AdoptionPetType type,
                                                     @Param("size") AdoptionPetSize size,
                                                     @Param("limit") int limit);

    List<AdoptionPet> findByTypeAndBreedAndAvailableTrue(AdoptionPetType type, String breed);

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true AND p.id != :petId " +
            "AND p.type = :type AND p.size = :size " +
            "AND p.age BETWEEN :minAge AND :maxAge")
    List<AdoptionPet> findSimilarByTypeSizeAndAge(@Param("petId") Long petId,
                                                  @Param("type") AdoptionPetType type,
                                                  @Param("size") AdoptionPetSize size,
                                                  @Param("minAge") Integer minAge,
                                                  @Param("maxAge") Integer maxAge);

    // ============================================================
    // MÉTHODES DE RECHERCHE AVANCÉE
    // ============================================================

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true " +
            "AND (:type IS NULL OR p.type = :type) " +
            "AND (:breed IS NULL OR LOWER(p.breed) LIKE LOWER(CONCAT('%', :breed, '%'))) " +
            "AND (:minAge IS NULL OR p.age >= :minAge) " +
            "AND (:maxAge IS NULL OR p.age <= :maxAge) " +
            "AND (:size IS NULL OR p.size = :size) " +
            "AND (:gender IS NULL OR p.gender = :gender) " +
            "AND (:spayedNeutered IS NULL OR p.spayedNeutered = :spayedNeutered)")
    List<AdoptionPet> advancedSearch(@Param("type") AdoptionPetType type,
                                     @Param("breed") String breed,
                                     @Param("minAge") Integer minAge,
                                     @Param("maxAge") Integer maxAge,
                                     @Param("size") AdoptionPetSize size,
                                     @Param("gender") String gender,
                                     @Param("spayedNeutered") Boolean spayedNeutered);

    // ============================================================
    // MÉTHODES DE POPULARITÉ ET STATISTIQUES
    // ============================================================

    @Query("SELECT p, COUNT(r) as requestCount FROM AdoptionPet p " +
            "LEFT JOIN AdoptionRequest r ON p = r.pet " +
            "WHERE p.available = true " +
            "GROUP BY p ORDER BY requestCount DESC")
    List<Object[]> findMostRequestedPets(@Param("limit") int limit);

    // ============================================================
    // MÉTHODES DE RÉCENCE ET URGENCE - CORRIGÉES
    // ============================================================

    @Query(value = "SELECT * FROM adoption_pet p WHERE p.available = true " +
            "AND p.created_at >= DATE_SUB(NOW(), INTERVAL :days DAY) " +
            "ORDER BY p.created_at DESC LIMIT :limit", nativeQuery = true)
    List<AdoptionPet> findRecentlyAdded(@Param("limit") int limit, @Param("days") int days);

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true " +
            "AND (p.specialNeeds IS NOT NULL AND p.specialNeeds != '' " +
            "OR p.createdAt <= CURRENT_TIMESTAMP - 30 DAY) " +
            "ORDER BY p.createdAt ASC")
    List<AdoptionPet> findUrgentPets();

    // ============================================================
    // MÉTHODES DE COMPTAGE ET STATISTIQUES
    // ============================================================

    @Query("SELECT p.type, COUNT(p) FROM AdoptionPet p WHERE p.available = true GROUP BY p.type")
    List<Object[]> countByType();

    @Query("SELECT p.size, COUNT(p) FROM AdoptionPet p WHERE p.available = true GROUP BY p.size")
    List<Object[]> countBySize();

    @Query("SELECT p.shelter.id, COUNT(p) FROM AdoptionPet p WHERE p.available = true GROUP BY p.shelter.id")
    List<Object[]> countByShelter();

    // ============================================================
    // MÉTHODES PAR LOCALISATION
    // ============================================================

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true " +
            "AND p.shelter.address LIKE CONCAT('%', :region, '%')")
    List<AdoptionPet> findAvailableByShelterRegion(@Param("region") String region);

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true " +
            "AND p.shelter.address LIKE CONCAT('%', :city, '%')")
    List<AdoptionPet> findAvailableByShelterCity(@Param("city") String city);

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true " +
            "AND p.shelter.address LIKE CONCAT('%', :postalCode, '%')")
    List<AdoptionPet> findAvailableByShelterPostalCode(@Param("postalCode") String postalCode);

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    @Query("SELECT p.type, COUNT(p) FROM AdoptionPet p GROUP BY p.type")
    List<Object[]> countAllByType();

    @Query("SELECT YEAR(p.adoptedAt), MONTH(p.adoptedAt), COUNT(p) FROM AdoptionPet p " +
            "WHERE p.adoptedAt IS NOT NULL GROUP BY YEAR(p.adoptedAt), MONTH(p.adoptedAt)")
    List<Object[]> countAdoptedByMonth();

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true AND p.age/12 >= :years")
    List<AdoptionPet> findByAgeInYears(@Param("years") Integer years);

    List<AdoptionPet> findBySpayedNeuteredTrueAndAvailableTrue();

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true " +
            "AND p.specialNeeds IS NOT NULL AND p.specialNeeds != ''")
    List<AdoptionPet> findPetsWithSpecialNeeds();

    long countByAvailableTrue();

    // ============================================================
    // MÉTHODES CORRIGÉES (AVEC @Query)
    // ============================================================

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true " +
            "AND NOT EXISTS (SELECT r FROM AdoptionRequest r WHERE r.pet = p AND r.createdAt >= CURRENT_TIMESTAMP - :days DAY)")
    List<AdoptionPet> findPetsWithNoRequestsForDays(@Param("days") int days);

    @Query("SELECT p FROM AdoptionPet p WHERE p.available = true " +
            "AND NOT EXISTS (SELECT c FROM Contract c WHERE c.animal = p)")
    List<AdoptionPet> findPetsWithoutContract();

    @Query("SELECT p, COUNT(r) as requestCount FROM AdoptionPet p " +
            "LEFT JOIN AdoptionRequest r ON p = r.pet " +
            "WHERE p.available = true " +
            "GROUP BY p ORDER BY requestCount DESC")
    List<Object[]> findPetsWithRequestCount();

    long countByAvailable(boolean available);
}