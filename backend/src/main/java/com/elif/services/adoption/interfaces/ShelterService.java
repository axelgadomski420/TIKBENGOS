package com.elif.services.adoption.interfaces;

import com.elif.entities.adoption.Shelter;

import java.util.List;

public interface ShelterService {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    List<Shelter> findAll();

    Shelter findById(Long id);

    Shelter findByEmail(String email);

    List<Shelter> findVerified();

    List<Shelter> findNotVerified();

    List<Shelter> searchByName(String name);

    Shelter create(Shelter shelter);

    Shelter update(Long id, Shelter shelterDetails);

    Shelter verifyShelter(Long id);
    Shelter findByUserId(Long userId);
    void delete(Long id);

    boolean existsByEmail(String email);

    boolean existsByLicenseNumber(String licenseNumber);


    // ============================================================
    // MÉTHODES PAR LOCALISATION
    // ============================================================

    List<Shelter> findByCity(String city);

    List<Shelter> findByPostalCode(String postalCode);

    List<Shelter> findByRegion(String region);

    List<Shelter> findNearby(double latitude, double longitude, double radiusKm);

    // ============================================================
    // MÉTHODES DE STATISTIQUES
    // ============================================================

    List<Object[]> countPetsPerShelter();

    List<Object[]> countAvailablePetsPerShelter();

    List<Object[]> countAdoptedPetsPerShelter();

    List<Object[]> findTopSheltersByAdoptions(int limit);

    List<Object[]> findTopSheltersByAvailablePets(int limit);

    List<Object[]> findTopSheltersByTotalPets(int limit);

    List<Object[]> findSheltersWithAdoptionRate();

    List<Object[]> findSheltersNeedingSupport(double minAdoptionRate);

    // ============================================================
    // MÉTHODES DE RECHERCHE AVANCÉE
    // ============================================================

    List<Shelter> searchShelters(String keyword);

    List<Shelter> searchSheltersFullText(String keyword);

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    List<Object[]> findSheltersWithStatistics();

    List<Shelter> findTopVerifiedShelters(int limit);

    long countVerified();

    long countNotVerified();

    List<Object[]> countByRegion();

    List<Object[]> countByCity();
}