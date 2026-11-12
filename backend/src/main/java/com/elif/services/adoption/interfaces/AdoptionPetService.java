package com.elif.services.adoption.interfaces;

import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetSize;

import java.util.List;

public interface AdoptionPetService {

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    List<AdoptionPet> findAll();

    AdoptionPet findById(Long id);

    List<AdoptionPet> findAvailable();

    List<AdoptionPet> findByShelterId(Long shelterId);

    List<AdoptionPet> findByType(AdoptionPetType type);

    List<AdoptionPet> findBySize(AdoptionPetSize size);

    List<AdoptionPet> findByBreed(String breed);

    List<AdoptionPet> findAvailableByType(AdoptionPetType type);

    List<AdoptionPet> findAvailableBySize(AdoptionPetSize size);

    List<AdoptionPet> findAvailableByMaxAge(Integer maxAge);

    AdoptionPet create(AdoptionPet pet, Long shelterId);

    AdoptionPet update(Long id, AdoptionPet petDetails);

    AdoptionPet markAsAdopted(Long id);

    void delete(Long id);

    boolean isAvailable(Long id);

    // ============================================================
    // MÉTHODES DE RECOMMANDATION ET SIMILARITÉ
    // ============================================================

    List<AdoptionPet> findSimilarPets(Long petId, Long limit);

    List<AdoptionPet> recommendPetsByUserPreferences(Long userId, AdoptionPetType type, AdoptionPetSize size, int limit);

    List<AdoptionPet> findByTypeAndBreedAndAvailableTrue(AdoptionPetType type, String breed);

    List<AdoptionPet> findSimilarByTypeSizeAndAge(Long petId, AdoptionPetType type, AdoptionPetSize size, Integer minAge, Integer maxAge);

    // ============================================================
    // MÉTHODES DE RECHERCHE AVANCÉE
    // ============================================================

    List<AdoptionPet> advancedSearch(AdoptionPetType type, String breed, Integer minAge, Integer maxAge,
                                     AdoptionPetSize size, String gender, Boolean spayedNeutered);

    // ============================================================
    // MÉTHODES DE POPULARITÉ ET STATISTIQUES
    // ============================================================

    List<Object[]> findMostRequestedPets(int limit);

    List<Object[]> findPetsWithRequestCount();

    // ============================================================
    // MÉTHODES DE RÉCENCE ET URGENCE
    // ============================================================

    List<AdoptionPet> findRecentlyAdded(int limit, int days);

    List<AdoptionPet> findUrgentPets();

    // ============================================================
    // MÉTHODES DE COMPTAGE ET STATISTIQUES
    // ============================================================

    List<Object[]> countByType();

    List<Object[]> countBySize();

    List<Object[]> countByShelter();

    List<Object[]> countAllByType();

    List<Object[]> countAdoptedByMonth();

    long countAvailable();

    // ============================================================
    // MÉTHODES PAR LOCALISATION
    // ============================================================

    List<AdoptionPet> findAvailableByShelterRegion(String region);

    List<AdoptionPet> findAvailableByShelterCity(String city);

    List<AdoptionPet> findAvailableByShelterPostalCode(String postalCode);

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    List<AdoptionPet> findPetsWithoutContract();

    List<AdoptionPet> findPetsWithNoRequestsForDays(int days);

    List<AdoptionPet> findByAgeInYears(Integer years);

    List<AdoptionPet> findSterilizedAvailable();

    List<AdoptionPet> findPetsWithSpecialNeeds();
}