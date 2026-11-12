package com.elif.services.adoption.impl;

import com.elif.entities.adoption.Shelter;
import com.elif.repositories.adoption.ShelterRepository;
import com.elif.services.adoption.interfaces.ShelterService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ShelterServiceImpl implements ShelterService {

    private final ShelterRepository shelterRepository;

    // ============================================================
    // CONSTRUCTEUR
    // ============================================================

    public ShelterServiceImpl(ShelterRepository shelterRepository) {
        this.shelterRepository = shelterRepository;
    }

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    @Override
    public List<Shelter> findAll() {
        return shelterRepository.findAll();
    }

    @Override
    public Shelter findById(Long id) {
        return shelterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Refuge non trouvé avec l'id: " + id));
    }

    @Override
    public Shelter findByEmail(String email) {
        return shelterRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Refuge non trouvé avec l'email: " + email));
    }

    @Override
    public List<Shelter> findVerified() {
        return shelterRepository.findByVerifiedTrue();
    }

    @Override
    public List<Shelter> findNotVerified() {
        return shelterRepository.findByVerifiedFalse();
    }

    @Override
    public List<Shelter> searchByName(String name) {
        return shelterRepository.searchByName(name);
    }

    @Override
    public Shelter create(Shelter shelter) {
        if (shelterRepository.existsByEmail(shelter.getEmail())) {
            throw new RuntimeException("Un refuge avec cet email existe déjà");
        }
        if (shelter.getLicenseNumber() != null && shelterRepository.existsByLicenseNumber(shelter.getLicenseNumber())) {
            throw new RuntimeException("Un refuge avec ce numéro d'agrément existe déjà");
        }
        shelter.setVerified(false);
        return shelterRepository.save(shelter);
    }

    @Override
    public Shelter update(Long id, Shelter shelterDetails) {
        Shelter existing = findById(id);

        existing.setName(shelterDetails.getName());
        existing.setAddress(shelterDetails.getAddress());
        existing.setPhone(shelterDetails.getPhone());
        existing.setEmail(shelterDetails.getEmail());
        existing.setDescription(shelterDetails.getDescription());
        existing.setLogoUrl(shelterDetails.getLogoUrl());

        if (shelterDetails.getLicenseNumber() != null) {
            existing.setLicenseNumber(shelterDetails.getLicenseNumber());
        }

        return shelterRepository.save(existing);
    }

    @Override
    public Shelter verifyShelter(Long id) {
        Shelter shelter = findById(id);
        shelter.setVerified(true);
        return shelterRepository.save(shelter);
    }

    @Override
    public void delete(Long id) {
        Shelter shelter = findById(id);
        shelterRepository.delete(shelter);
    }

    @Override
    public boolean existsByEmail(String email) {
        return shelterRepository.existsByEmail(email);
    }

    @Override
    public boolean existsByLicenseNumber(String licenseNumber) {
        return shelterRepository.existsByLicenseNumber(licenseNumber);
    }

    // ============================================================
    // MÉTHODES PAR LOCALISATION
    // ============================================================

    @Override
    public List<Shelter> findByCity(String city) {
        return shelterRepository.findByCity(city);
    }

    @Override
    public List<Shelter> findByPostalCode(String postalCode) {
        return shelterRepository.findByPostalCode(postalCode);
    }

    @Override
    public List<Shelter> findByRegion(String region) {
        return shelterRepository.findByRegion(region);
    }

    @Override
    public List<Shelter> findNearby(double latitude, double longitude, double radiusKm) {
        return shelterRepository.findNearby(latitude, longitude, radiusKm);
    }

    // ============================================================
    // MÉTHODES DE STATISTIQUES
    // ============================================================

    @Override
    public List<Object[]> countPetsPerShelter() {
        return shelterRepository.countPetsPerShelter();
    }

    @Override
    public List<Object[]> countAvailablePetsPerShelter() {
        return shelterRepository.countAvailablePetsPerShelter();
    }

    @Override
    public List<Object[]> countAdoptedPetsPerShelter() {
        return shelterRepository.countAdoptedPetsPerShelter();
    }

    @Override
    public List<Object[]> findTopSheltersByAdoptions(int limit) {
        return shelterRepository.findTopSheltersByAdoptions(limit);
    }

    @Override
    public List<Object[]> findTopSheltersByAvailablePets(int limit) {
        return shelterRepository.findTopSheltersByAvailablePets(limit);
    }

    @Override
    public List<Object[]> findTopSheltersByTotalPets(int limit) {
        return shelterRepository.findTopSheltersByTotalPets(limit);
    }

    @Override
    public List<Object[]> findSheltersWithAdoptionRate() {
        return shelterRepository.findSheltersWithAdoptionRate();
    }

    @Override
    public List<Object[]> findSheltersNeedingSupport(double minAdoptionRate) {
        return shelterRepository.findSheltersNeedingSupport(minAdoptionRate);
    }
    @Override
    public Shelter findByUserId(Long userId) {
        return shelterRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Shelter not found for user: " + userId));
    }
    // ============================================================
    // MÉTHODES DE RECHERCHE AVANCÉE
    // ============================================================

    @Override
    public List<Shelter> searchShelters(String keyword) {
        return shelterRepository.searchShelters(keyword);
    }

    @Override
    public List<Shelter> searchSheltersFullText(String keyword) {
        return shelterRepository.searchSheltersFullText(keyword);
    }

    // ============================================================
    // MÉTHODES SUPPLÉMENTAIRES
    // ============================================================

    @Override
    public List<Object[]> findSheltersWithStatistics() {
        return shelterRepository.findSheltersWithStatistics();
    }

    @Override
    public List<Shelter> findTopVerifiedShelters(int limit) {
        return shelterRepository.findTopVerifiedShelters(limit);
    }

    @Override
    public long countVerified() {
        return shelterRepository.countByVerifiedTrue();
    }

    @Override
    public long countNotVerified() {
        return shelterRepository.countByVerifiedFalse();
    }

    @Override
    public List<Object[]> countByRegion() {
        return shelterRepository.countByRegion();
    }

    @Override
    public List<Object[]> countByCity() {
        return shelterRepository.countByCity();
    }
}