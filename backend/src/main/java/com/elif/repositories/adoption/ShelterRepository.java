package com.elif.repositories.adoption;

import com.elif.entities.adoption.Shelter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShelterRepository extends JpaRepository<Shelter, Long> {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    Optional<Shelter> findByEmail(String email);

    Optional<Shelter> findByLicenseNumber(String licenseNumber);

    Optional<Shelter> findByUserId(Long userId);  // ← CORRIGÉ (déplacé)

    List<Shelter> findByVerifiedTrue();

    List<Shelter> findByVerifiedFalse();

    boolean existsByEmail(String email);

    boolean existsByLicenseNumber(String licenseNumber);

    @Query("SELECT s FROM Shelter s WHERE s.name LIKE %:name%")
    List<Shelter> searchByName(@Param("name") String name);

    // ============================================================
    // MÉTHODES PAR LOCALISATION
    // ============================================================

    @Query("SELECT s FROM Shelter s WHERE s.address LIKE %:city%")
    List<Shelter> findByCity(@Param("city") String city);

    @Query("SELECT s FROM Shelter s WHERE s.address LIKE %:postalCode%")
    List<Shelter> findByPostalCode(@Param("postalCode") String postalCode);

    @Query("SELECT s FROM Shelter s WHERE s.address LIKE %:region%")
    List<Shelter> findByRegion(@Param("region") String region);

    @Query(value = "SELECT * FROM shelter s WHERE " +
            "(6371 * acos(cos(radians(:latitude)) * cos(radians(s.latitude)) " +
            "* cos(radians(s.longitude) - radians(:longitude)) + sin(radians(:latitude)) " +
            "* sin(radians(s.latitude)))) <= :radiusKm", nativeQuery = true)
    List<Shelter> findNearby(@Param("latitude") double latitude,
                             @Param("longitude") double longitude,
                             @Param("radiusKm") double radiusKm);

    // ============================================================
    // MÉTHODES DE COMPTAGE PAR REFUGE
    // ============================================================

    @Query("SELECT s.id, s.name, COUNT(p) FROM Shelter s LEFT JOIN AdoptionPet p ON s = p.shelter GROUP BY s.id")
    List<Object[]> countPetsPerShelter();

    @Query("SELECT s.id, s.name, COUNT(p) FROM Shelter s LEFT JOIN AdoptionPet p ON s = p.shelter " +
            "WHERE p.available = true GROUP BY s.id")
    List<Object[]> countAvailablePetsPerShelter();

    @Query("SELECT s.id, s.name, COUNT(c) FROM Shelter s LEFT JOIN Contract c ON s = c.shelter " +
            "GROUP BY s.id")
    List<Object[]> countAdoptedPetsPerShelter();

    // ============================================================
    // MÉTHODES POUR CLASSEMENT DES REFUGES
    // ============================================================

    @Query("SELECT s.id, s.name, COUNT(c) FROM Shelter s LEFT JOIN Contract c ON s = c.shelter " +
            "GROUP BY s.id ORDER BY COUNT(c) DESC")
    List<Object[]> findTopSheltersByAdoptions(@Param("limit") int limit);

    @Query("SELECT s.id, s.name, COUNT(p) FROM Shelter s LEFT JOIN AdoptionPet p ON s = p.shelter " +
            "WHERE p.available = true GROUP BY s.id ORDER BY COUNT(p) DESC")
    List<Object[]> findTopSheltersByAvailablePets(@Param("limit") int limit);

    @Query("SELECT s.id, s.name, COUNT(p) FROM Shelter s LEFT JOIN AdoptionPet p ON s = p.shelter " +
            "GROUP BY s.id ORDER BY COUNT(p) DESC")
    List<Object[]> findTopSheltersByTotalPets(@Param("limit") int limit);

    // ============================================================
    // MÉTHODES POUR TAUX D'ADOPTION
    // ============================================================

    @Query("SELECT s, (COUNT(c) * 1.0 / NULLIF(COUNT(p), 0)) as adoptionRate " +
            "FROM Shelter s LEFT JOIN s.pets p LEFT JOIN Contract c ON p = c.animal " +
            "GROUP BY s")
    List<Object[]> findSheltersWithAdoptionRate();

    @Query("SELECT s, (COUNT(c) * 1.0 / NULLIF(COUNT(p), 0)) as adoptionRate " +
            "FROM Shelter s LEFT JOIN s.pets p LEFT JOIN Contract c ON p = c.animal " +
            "GROUP BY s HAVING (COUNT(c) * 1.0 / NULLIF(COUNT(p), 0)) < :minAdoptionRate")
    List<Object[]> findSheltersNeedingSupport(@Param("minAdoptionRate") double minAdoptionRate);

    // ============================================================
    // MÉTHODES DE COMPTAGE PAR RÉGION
    // ============================================================

    @Query("SELECT s.address, COUNT(s) FROM Shelter s GROUP BY s.address")
    List<Object[]> countByRegion();

    @Query("SELECT SUBSTRING(s.address, LOCATE(',', s.address) + 1) as city, COUNT(s) " +
            "FROM Shelter s GROUP BY city")
    List<Object[]> countByCity();

    // ============================================================
    // MÉTHODES DE RECHERCHE AVANCÉE
    // ============================================================

    @Query("SELECT s FROM Shelter s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Shelter> searchShelters(@Param("keyword") String keyword);

    @Query("SELECT s FROM Shelter s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(s.address) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Shelter> searchSheltersFullText(@Param("keyword") String keyword);

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    @Query("SELECT s, COUNT(DISTINCT p), COUNT(DISTINCT CASE WHEN p.available = true THEN p END), COUNT(DISTINCT c) " +
            "FROM Shelter s LEFT JOIN s.pets p LEFT JOIN Contract c ON s = c.shelter " +
            "GROUP BY s")
    List<Object[]> findSheltersWithStatistics();

    @Query("SELECT s FROM Shelter s WHERE s.verified = true ORDER BY SIZE(s.pets) DESC")
    List<Shelter> findTopVerifiedShelters(@Param("limit") int limit);

    long countByVerifiedTrue();

    long countByVerifiedFalse();
}