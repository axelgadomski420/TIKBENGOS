package com.elif.services.adoption.impl;

import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.Shelter;
import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetSize;
import com.elif.repositories.adoption.AdoptionPetRepository;
import com.elif.services.adoption.interfaces.AdoptionPetService;
import com.elif.services.adoption.interfaces.ShelterService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class AdoptionPetServiceImpl implements AdoptionPetService {

    private final AdoptionPetRepository petRepository;
    private final ShelterService shelterService;

    // ============================================================
    // CONSTRUCTEUR
    // ============================================================

    public AdoptionPetServiceImpl(AdoptionPetRepository petRepository, ShelterService shelterService) {
        this.petRepository = petRepository;
        this.shelterService = shelterService;
    }

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    @Override
    public List<AdoptionPet> findAll() {
        return petRepository.findAll();
    }

    @Override
    public AdoptionPet findById(Long id) {
        return petRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Animal non trouvé avec l'id: " + id));
    }

    @Override
    public List<AdoptionPet> findAvailable() {
        return petRepository.findByAvailableTrue();
    }

    @Override
    public List<AdoptionPet> findByShelterId(Long shelterId) {
        return petRepository.findByShelterId(shelterId);
    }

    @Override
    public List<AdoptionPet> findByType(AdoptionPetType type) {
        return petRepository.findByType(type);
    }

    @Override
    public List<AdoptionPet> findBySize(AdoptionPetSize size) {
        return petRepository.findBySize(size);
    }

    @Override
    public List<AdoptionPet> findByBreed(String breed) {
        return petRepository.findByBreedContainingIgnoreCase(breed);
    }

    @Override
    public List<AdoptionPet> findAvailableByType(AdoptionPetType type) {
        return petRepository.findAvailableByType(type);
    }

    @Override
    public List<AdoptionPet> findAvailableBySize(AdoptionPetSize size) {
        return petRepository.findAvailableBySize(size);
    }

    @Override
    public List<AdoptionPet> findAvailableByMaxAge(Integer maxAge) {
        return petRepository.findAvailableByAgeLessThanEqual(maxAge);
    }

    @Override
    public AdoptionPet create(AdoptionPet pet, Long shelterId) {
        Shelter shelter = shelterService.findById(shelterId);
        pet.setShelter(shelter);
        pet.setAvailable(true);
        return petRepository.save(pet);
    }

    @Override
    public AdoptionPet update(Long id, AdoptionPet petDetails) {
        AdoptionPet existing = findById(id);

        existing.setName(petDetails.getName());
        existing.setType(petDetails.getType());
        existing.setBreed(petDetails.getBreed());
        existing.setAge(petDetails.getAge());
        existing.setGender(petDetails.getGender());
        existing.setSize(petDetails.getSize());
        existing.setColor(petDetails.getColor());
        existing.setHealthStatus(petDetails.getHealthStatus());
        existing.setSpayedNeutered(petDetails.getSpayedNeutered());
        existing.setSpecialNeeds(petDetails.getSpecialNeeds());
        existing.setDescription(petDetails.getDescription());
        existing.setPhotos(petDetails.getPhotos());

        return petRepository.save(existing);
    }

    @Override
    public AdoptionPet markAsAdopted(Long id) {
        AdoptionPet pet = findById(id);
        pet.setAvailable(false);
        pet.setAdoptedAt(LocalDateTime.now());
        return petRepository.save(pet);
    }

    @Override
    public void delete(Long id) {
        AdoptionPet pet = findById(id);
        petRepository.delete(pet);
    }

    @Override
    public boolean isAvailable(Long id) {
        AdoptionPet pet = findById(id);
        return pet.getAvailable();
    }

    // ============================================================
    // MÉTHODES DE RECOMMANDATION ET SIMILARITÉ
    // ============================================================

    @Override
    public List<AdoptionPet> findSimilarPets(Long petId, Long limit) {
        return petRepository.findSimilarPets(petId, limit);
    }

    @Override
    public List<AdoptionPet> recommendPetsByUserPreferences(Long userId, AdoptionPetType type, AdoptionPetSize size, int limit) {
        return petRepository.recommendPetsByUserPreferences(userId, type, size, limit);
    }

    @Override
    public List<AdoptionPet> findByTypeAndBreedAndAvailableTrue(AdoptionPetType type, String breed) {
        return petRepository.findByTypeAndBreedAndAvailableTrue(type, breed);
    }

    @Override
    public List<AdoptionPet> findSimilarByTypeSizeAndAge(Long petId, AdoptionPetType type, AdoptionPetSize size, Integer minAge, Integer maxAge) {
        return petRepository.findSimilarByTypeSizeAndAge(petId, type, size, minAge, maxAge);
    }

    // ============================================================
    // MÉTHODES DE RECHERCHE AVANCÉE
    // ============================================================

    @Override
    public List<AdoptionPet> advancedSearch(AdoptionPetType type, String breed, Integer minAge, Integer maxAge,
                                            AdoptionPetSize size, String gender, Boolean spayedNeutered) {
        return petRepository.advancedSearch(type, breed, minAge, maxAge, size, gender, spayedNeutered);
    }

    // ============================================================
    // MÉTHODES DE POPULARITÉ ET STATISTIQUES
    // ============================================================

    @Override
    public List<Object[]> findMostRequestedPets(int limit) {
        return petRepository.findMostRequestedPets(limit);
    }

    @Override
    public List<Object[]> findPetsWithRequestCount() {
        return petRepository.findPetsWithRequestCount();
    }

    // ============================================================
    // MÉTHODES DE RÉCENCE ET URGENCE
    // ============================================================

    @Override
    public List<AdoptionPet> findRecentlyAdded(int limit, int days) {
        return petRepository.findRecentlyAdded(limit, days);
    }

    @Override
    public List<AdoptionPet> findUrgentPets() {
        return petRepository.findUrgentPets();
    }

    // ============================================================
    // MÉTHODES DE COMPTAGE ET STATISTIQUES
    // ============================================================

    @Override
    public List<Object[]> countByType() {
        return petRepository.countByType();
    }

    @Override
    public List<Object[]> countBySize() {
        return petRepository.countBySize();
    }

    @Override
    public List<Object[]> countByShelter() {
        return petRepository.countByShelter();
    }

    @Override
    public List<Object[]> countAllByType() {
        return petRepository.countAllByType();
    }

    @Override
    public List<Object[]> countAdoptedByMonth() {
        return petRepository.countAdoptedByMonth();
    }

    @Override
    public long countAvailable() {
        return petRepository.countByAvailableTrue();
    }

    // ============================================================
    // MÉTHODES PAR LOCALISATION
    // ============================================================

    @Override
    public List<AdoptionPet> findAvailableByShelterRegion(String region) {
        return petRepository.findAvailableByShelterRegion(region);
    }

    @Override
    public List<AdoptionPet> findAvailableByShelterCity(String city) {
        return petRepository.findAvailableByShelterCity(city);
    }

    @Override
    public List<AdoptionPet> findAvailableByShelterPostalCode(String postalCode) {
        return petRepository.findAvailableByShelterPostalCode(postalCode);
    }

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    @Override
    public List<AdoptionPet> findPetsWithoutContract() {
        return petRepository.findPetsWithoutContract();
    }

    @Override
    public List<AdoptionPet> findPetsWithNoRequestsForDays(int days) {
        return petRepository.findPetsWithNoRequestsForDays(days);
    }

    @Override
    public List<AdoptionPet> findByAgeInYears(Integer years) {
        return petRepository.findByAgeInYears(years);
    }

    @Override
    public List<AdoptionPet> findSterilizedAvailable() {
        return petRepository.findBySpayedNeuteredTrueAndAvailableTrue();
    }

    @Override
    public List<AdoptionPet> findPetsWithSpecialNeeds() {
        return petRepository.findPetsWithSpecialNeeds();
    }
}