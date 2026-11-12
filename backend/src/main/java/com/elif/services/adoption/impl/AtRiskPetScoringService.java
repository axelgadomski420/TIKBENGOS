package com.elif.services.adoption.impl;

import com.elif.dto.adoption.response.AtRiskPetDTO;
import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.AdoptionRequest;
import com.elif.repositories.adoption.AdoptionPetRepository;
import com.elif.repositories.adoption.AdoptionRequestRepository;
import com.elif.services.adoption.interfaces.IAtRiskPetScoringService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service IA de détection et scoring des animaux "à risque".
 *
 * Algorithme de scoring (score de 0 à 100) :
 *  - Durée en shelter sans adoption  : 0 à 40 pts
 *  - Absence de demandes             : 0 à 25 pts
 *  - Profil de l'animal (âge, type)  : 0 à 20 pts
 *  - Besoins spéciaux                : 0 à 10 pts
 *  - Absence de photos               : 0 à  5 pts
 *
 * Niveaux :
 *  SAFE     < 20   🟢
 *  WATCH   20-39   🟡
 *  AT_RISK 40-64   🟠
 *  CRITICAL >= 65  🔴
 */
@Service
public class AtRiskPetScoringService implements IAtRiskPetScoringService {

    private final AdoptionPetRepository    petRepository;
    private final AdoptionRequestRepository requestRepository;

    public AtRiskPetScoringService(AdoptionPetRepository petRepository,
                                   AdoptionRequestRepository requestRepository) {
        this.petRepository     = petRepository;
        this.requestRepository = requestRepository;
    }

    // ============================================================
    // MÉTHODE PRINCIPALE — tous les animaux disponibles scorés
    // ============================================================

    @Override
    public List<AtRiskPetDTO> analyzeAllAvailablePets() {
        List<AdoptionPet> available = petRepository.findByAvailableTrue();
        return available.stream()
                .map(this::analyze)
                .filter(dto -> dto.getRiskScore() >= 20) // Exclure les SAFE < 20
                .sorted(Comparator.comparingInt(AtRiskPetDTO::getRiskScore).reversed())
                .collect(Collectors.toList());
    }

    @Override
    public List<AtRiskPetDTO> analyzeByShelterId(Long shelterId) {
        List<AdoptionPet> pets = petRepository.findByShelterId(shelterId).stream()
                .filter(p -> Boolean.TRUE.equals(p.getAvailable()))
                .collect(Collectors.toList());
        return pets.stream()
                .map(this::analyze)
                .sorted(Comparator.comparingInt(AtRiskPetDTO::getRiskScore).reversed())
                .collect(Collectors.toList());
    }

    @Override
    public List<AtRiskPetDTO> getCriticalOnly() {
        return analyzeAllAvailablePets().stream()
                .filter(dto -> "CRITICAL".equals(dto.getRiskLevel()) ||
                        "AT_RISK".equals(dto.getRiskLevel()))
                .collect(Collectors.toList());
    }

    // ============================================================
    // ANALYSE D'UN SEUL ANIMAL
    // ============================================================

    @Override
    public AtRiskPetDTO analyze(AdoptionPet pet) {
        AtRiskPetDTO dto = new AtRiskPetDTO();

        // ── Infos de base ──
        dto.setPetId(pet.getId());
        dto.setPetName(pet.getName());
        dto.setPetType(pet.getType() != null ? pet.getType().name() : null);
        dto.setPetBreed(pet.getBreed());
        dto.setPetAge(pet.getAge());
        dto.setPetGender(pet.getGender() != null ? pet.getGender().name() : null);
        dto.setPetSize(pet.getSize() != null ? pet.getSize().name() : null);
        dto.setPetPhotos(pet.getPhotos());
        dto.setSpecialNeeds(pet.getSpecialNeeds());
        dto.setSpayedNeutered(pet.getSpayedNeutered());
        dto.setCreatedAt(pet.getCreatedAt());

        // ── Infos shelter ──
        if (pet.getShelter() != null) {
            dto.setShelterId(pet.getShelter().getId());
            dto.setShelterName(pet.getShelter().getName());
            dto.setShelterEmail(pet.getShelter().getEmail());
        }

        // ── Métriques temporelles ──
        int daysInShelter = pet.getCreatedAt() != null
                ? (int) ChronoUnit.DAYS.between(pet.getCreatedAt(), LocalDateTime.now())
                : 0;
        dto.setDaysInShelter(daysInShelter);

        // ── Métriques demandes ──
        List<AdoptionRequest> requests = requestRepository.findByPetId(pet.getId());
        dto.setRequestCount(requests.size());

        requests.stream()
                .map(AdoptionRequest::getDateRequested)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .ifPresent(dto::setLastRequestDate);

        // ── Calcul du score ──
        List<String> factors   = new ArrayList<>();
        List<String> recs      = new ArrayList<>();
        int score = computeScore(pet, daysInShelter, requests, factors, recs);
        score = Math.min(Math.max(score, 0), 100);

        dto.setRiskScore(score);
        dto.setRiskLevel(getRiskLevel(score));
        dto.setRiskColor(getRiskColor(score));
        dto.setRiskFactors(factors);
        dto.setRecommendations(recs);

        return dto;
    }

    // ============================================================
    // ALGORITHME DE SCORING
    // ============================================================

    private int computeScore(AdoptionPet pet, int days,
                             List<AdoptionRequest> requests,
                             List<String> factors,
                             List<String> recs) {
        int score = 0;

        // ── 1. Durée en shelter (0-40 pts) ──
        int durationScore = 0;
        if      (days >= 90) { durationScore = 40; }
        else if (days >= 60) { durationScore = 30; }
        else if (days >= 30) { durationScore = 20; }
        else if (days >= 14) { durationScore = 10; }

        if (durationScore > 0) {
            score += durationScore;
            factors.add("📅 In shelter for " + days + " days");
            if (days >= 90) {
                recs.add("🚨 Urgently highlight this animal on the homepage");
                recs.add("📢 Launch a dedicated social media campaign");
            } else if (days >= 60) {
                recs.add("📌 Feature this animal in the 'Animals of the week' section");
                recs.add("📧 Send a targeted email campaign to potential adopters");
            } else if (days >= 30) {
                recs.add("🔝 Boost this animal's visibility on the platform");
            }
        }

        // ── 2. Absence ou rareté de demandes (0-25 pts) ──
        int reqScore = 0;
        if (requests.isEmpty()) {
            reqScore = 25;
            factors.add("📭 No adoption requests received");
            recs.add("📸 Add more high-quality photos to attract adopters");
            recs.add("✍️ Rewrite the animal's description to be more engaging");
        } else if (requests.size() == 1) {
            reqScore = 15;
            factors.add("📬 Only 1 request received");
            recs.add("💰 Consider reducing the adoption fee temporarily");
        } else if (requests.size() <= 3) {
            reqScore = 8;
            factors.add("📬 Few requests received (" + requests.size() + ")");
        }

        // Bonus si la dernière demande date de plus de 14 jours
        if (!requests.isEmpty() && requests.stream()
                .map(AdoptionRequest::getDateRequested)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .map(last -> ChronoUnit.DAYS.between(last, LocalDateTime.now()) > 14)
                .orElse(false)) {
            reqScore += 5;
            factors.add("🕐 No requests in the last 14 days");
        }

        score += reqScore;

        // ── 3. Profil de l'animal (0-20 pts) ──
        int profileScore = 0;

        // Âge (animaux âgés = plus difficile à adopter)
        if (pet.getAge() != null) {
            int ageMonths = pet.getAge();
            if (ageMonths > 96) {        // > 8 ans
                profileScore += 10;
                factors.add("👴 Senior animal (age: " + (ageMonths/12) + " years)");
                recs.add("❤️ Create a 'Senior Adoption' section to highlight older animals");
            } else if (ageMonths > 60) { // > 5 ans
                profileScore += 5;
                factors.add("🐾 Adult animal (age: " + (ageMonths/12) + " years)");
            }
        }

        // Type d'animal (reptiles, poissons = moins demandés)
        if (pet.getType() != null) {
            String type = pet.getType().name();
            if ("REPTILE".equals(type) || "POISSON".equals(type)) {
                profileScore += 8;
                factors.add("🦎 Exotic animal type — less demand on the platform");
                recs.add("🎓 Organize an awareness event about exotic animal adoption");
            } else if ("RONGEUR".equals(type) || "OISEAU".equals(type)) {
                profileScore += 4;
                factors.add("🐭 Small animal — moderate adoption rate");
            }
        }

        score += Math.min(profileScore, 20);

        // ── 4. Besoins spéciaux (0-10 pts) ──
        if (pet.getSpecialNeeds() != null && !pet.getSpecialNeeds().isBlank()) {
            score += 10;
            factors.add("🏥 Has special care needs");
            recs.add("🤝 Partner with veterinary clinics to find informed adopters");
            recs.add("📋 Clearly display care requirements to filter serious candidates");
        }

        // ── 5. Absence de photos (0-5 pts) ──
        boolean hasPhotos = pet.getPhotos() != null && !pet.getPhotos().isBlank()
                && !pet.getPhotos().equals("[]");
        if (!hasPhotos) {
            score += 5;
            factors.add("📷 No photos — reduces adoption chances by 60%");
            recs.add("📸 Add at least 3 quality photos immediately");
        }

        // Recommandation générale toujours présente
        if (recs.isEmpty()) {
            recs.add("👀 Continue monitoring — animal within normal adoption timeframe");
        }

        return score;
    }

    // ============================================================
    // NIVEAUX ET COULEURS
    // ============================================================

    @Override
    public String getRiskLevel(int score) {
        if (score >= 65) return "CRITICAL";
        if (score >= 40) return "AT_RISK";
        if (score >= 20) return "WATCH";
        return "SAFE";
    }

    @Override
    public String getRiskColor(int score) {
        if (score >= 65) return "#e53e3e"; // rouge
        if (score >= 40) return "#ed8936"; // orange
        if (score >= 20) return "#d69e2e"; // jaune
        return "#38a169";                  // vert
    }

    @Override
    public String getRiskLabel(int score) {
        if (score >= 65) return "🔴 Critical";
        if (score >= 40) return "🟠 At Risk";
        if (score >= 20) return "🟡 Watch";
        return "🟢 Safe";
    }

    // ============================================================
    // STATISTIQUES AGRÉGÉES
    // ============================================================

    @Override
    public Map<String, Object> getGlobalStats() {
        List<AtRiskPetDTO> all = analyzeAllAvailablePets();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalAnalyzed",  petRepository.countByAvailableTrue());
        stats.put("critical",       all.stream().filter(d -> "CRITICAL".equals(d.getRiskLevel())).count());
        stats.put("atRisk",         all.stream().filter(d -> "AT_RISK".equals(d.getRiskLevel())).count());
        stats.put("watch",          all.stream().filter(d -> "WATCH".equals(d.getRiskLevel())).count());
        stats.put("avgDaysInShelter",
                all.stream().mapToInt(AtRiskPetDTO::getDaysInShelter).average().orElse(0));
        stats.put("petsWithNoRequests",
                all.stream().filter(d -> d.getRequestCount() == 0).count());
        return stats;
    }
}