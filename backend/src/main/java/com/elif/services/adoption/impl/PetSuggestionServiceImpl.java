package com.elif.services.adoption.impl;  // ← comme AdoptionPetServiceImpl

import com.elif.dto.adoption.request.PetSearchCriteriaDTO;
import com.elif.dto.adoption.response.PetSuggestionDTO;
import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.enums.AdoptionPetSize;
import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.repositories.adoption.AdoptionPetRepository;
import com.elif.services.adoption.interfaces.PetSuggestionService;  // ← IMPORT CORRECT
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PetSuggestionServiceImpl implements PetSuggestionService {  // ← IMPLEMENTS

    private final AdoptionPetRepository petRepository;

    public PetSuggestionServiceImpl(AdoptionPetRepository petRepository) {
        this.petRepository = petRepository;
    }

    @Override
    public List<PetSuggestionDTO> getSuggestions(PetSearchCriteriaDTO criteria) {
        List<AdoptionPet> availablePets = petRepository.findByAvailableTrue();

        List<PetSuggestionDTO> suggestions = availablePets.stream()
                .map(pet -> scorePet(pet, criteria))
                .filter(dto -> dto.getCompatibilityScore() > 0)
                .sorted(Comparator.comparingInt(PetSuggestionDTO::getCompatibilityScore).reversed())
                .limit(10)
                .collect(Collectors.toList());

        return suggestions;
    }

    // ========== MÉTHODES PRIVÉES ==========

    private PetSuggestionDTO scorePet(AdoptionPet pet, PetSearchCriteriaDTO c) {
        int score = 0;
        List<String> matchReasons = new ArrayList<>();
        List<String> warningReasons = new ArrayList<>();

        // TYPE (30 pts)
        if (c.getType() != null) {
            if (pet.getType() == c.getType()) {
                score += 30;
                matchReasons.add("✅ Matches your preferred animal type");
            } else {
                score += 2;
            }
        } else {
            score += 15;
        }

        // TAILLE (20 pts)
        if (c.getSize() != null) {
            if (pet.getSize() == c.getSize()) {
                score += 20;
                matchReasons.add("✅ Perfect size match");
            } else if (isSizeClose(pet.getSize(), c.getSize())) {
                score += 10;
                matchReasons.add("⚡ Close to your preferred size");
            }
        } else {
            score += 10;
        }

        // GENRE (10 pts)
        if (c.getGender() != null) {
            if (pet.getGender() == c.getGender()) {
                score += 10;
                matchReasons.add("✅ Preferred gender match");
            }
        } else {
            score += 5;
        }

        // RACE (10 pts)
        if (c.getBreed() != null && !c.getBreed().isBlank()) {
            if (pet.getBreed() != null &&
                    pet.getBreed().toLowerCase().contains(c.getBreed().toLowerCase())) {
                score += 10;
                matchReasons.add("✅ Breed matches your preference");
            }
        }

        // COULEUR (5 pts)
        if (c.getColor() != null && !c.getColor().isBlank()) {
            if (pet.getColor() != null &&
                    pet.getColor().toLowerCase().contains(c.getColor().toLowerCase())) {
                score += 5;
                matchReasons.add("✅ Color matches your preference");
            }
        }

        // ÂGE (5 pts)
        if (c.getMaxAge() != null && pet.getAge() != null) {
            if (pet.getAge() <= c.getMaxAge()) {
                score += 5;
                matchReasons.add("✅ Within your preferred age range");
            } else {
                warningReasons.add("⚠️ Older than your preferred age");
            }
        }

        // STÉRILISATION (5 pts)
        if (c.getSpayedNeutered() != null && Boolean.TRUE.equals(c.getSpayedNeutered())) {
            if (Boolean.TRUE.equals(pet.getSpayedNeutered())) {
                score += 5;
                matchReasons.add("✅ Spayed/Neutered as preferred");
            }
        }

        // LOGEMENT (10 pts)
        if (c.getHousingType() != null) {
            score += scoreHousing(pet, c, matchReasons, warningReasons);
        }

        // ENFANTS (5 pts)
        if (Boolean.TRUE.equals(c.getHasChildren())) {
            boolean petOkForKids = (pet.getSpecialNeeds() == null || pet.getSpecialNeeds().isBlank())
                    && (pet.getAge() == null || pet.getAge() < 84);
            if (petOkForKids) {
                score += 5;
                matchReasons.add("✅ Suitable for families with children");
            } else {
                warningReasons.add("⚠️ May need extra care with young children");
            }
        }

        // EXPÉRIENCE
        if (c.getExperienceLevel() != null) {
            score += scoreExperience(pet, c, matchReasons, warningReasons);
        }

        // BESOINS SPÉCIAUX
        if (Boolean.TRUE.equals(c.getHasSpecialNeeds()) &&
                pet.getSpecialNeeds() != null && !pet.getSpecialNeeds().isBlank()) {
            score += 5;
            matchReasons.add("❤️ You're open to pets with special needs");
        }

        score = Math.min(score, 100);

        PetSuggestionDTO dto = new PetSuggestionDTO();
        dto.setId(pet.getId());
        dto.setName(pet.getName());
        dto.setType(pet.getType());
        dto.setBreed(pet.getBreed());
        dto.setAge(pet.getAge());
        dto.setGender(pet.getGender());
        dto.setSize(pet.getSize());
        dto.setColor(pet.getColor());
        dto.setHealthStatus(pet.getHealthStatus());
        dto.setSpayedNeutered(pet.getSpayedNeutered());
        dto.setSpecialNeeds(pet.getSpecialNeeds());
        dto.setDescription(pet.getDescription());
        dto.setPhotos(pet.getPhotos());
        dto.setShelterId(pet.getShelter() != null ? pet.getShelter().getId() : null);
        dto.setShelterName(pet.getShelter() != null ? pet.getShelter().getName() : null);
        dto.setCompatibilityScore(score);
        dto.setCompatibilityLabel(getLabel(score));
        dto.setMatchReasons(matchReasons);
        dto.setWarningReasons(warningReasons);

        return dto;
    }

    private int scoreHousing(AdoptionPet pet, PetSearchCriteriaDTO c,
                             List<String> match, List<String> warn) {
        String housing = c.getHousingType();
        AdoptionPetSize size = pet.getSize();
        AdoptionPetType type = pet.getType();
        boolean hasGarden = Boolean.TRUE.equals(c.getHasGarden());

        if ("APARTMENT".equals(housing) && !hasGarden) {
            if (type == AdoptionPetType.CHIEN &&
                    (size == AdoptionPetSize.GRAND || size == AdoptionPetSize.TRES_GRAND)) {
                warn.add("⚠️ Large dogs may not be ideal for apartments without a garden");
                return 2;
            }
            if (type == AdoptionPetType.CHIEN && size == AdoptionPetSize.PETIT) {
                match.add("✅ Small dog suitable for apartment living");
                return 8;
            }
            if (type == AdoptionPetType.CHAT || type == AdoptionPetType.LAPIN) {
                match.add("✅ Great choice for apartment living");
                return 10;
            }
        }

        if (("HOUSE".equals(housing) || "FARM".equals(housing)) && hasGarden) {
            match.add("✅ Your home with garden is perfect for this pet");
            return 10;
        }

        return 5;
    }

    private int scoreExperience(AdoptionPet pet, PetSearchCriteriaDTO c,
                                List<String> match, List<String> warn) {
        String exp = c.getExperienceLevel();
        boolean hasSpecialNeeds = pet.getSpecialNeeds() != null && !pet.getSpecialNeeds().isBlank();
        boolean isLargeOrAggressive = pet.getSize() == AdoptionPetSize.GRAND ||
                pet.getSize() == AdoptionPetSize.TRES_GRAND;

        if ("BEGINNER".equals(exp)) {
            if (hasSpecialNeeds || isLargeOrAggressive) {
                warn.add("⚠️ May require more experience to handle");
                return -5;
            }
            match.add("✅ Easy to handle for first-time owners");
            return 5;
        }

        if ("EXPERT".equals(exp)) {
            if (hasSpecialNeeds) {
                match.add("✅ Your experience is perfect for this pet's needs");
                return 5;
            }
        }

        return 3;
    }

    private boolean isSizeClose(AdoptionPetSize petSize, AdoptionPetSize preferred) {
        if (petSize == null || preferred == null) return false;
        int petOrd = petSize.ordinal();
        int prefOrd = preferred.ordinal();
        return Math.abs(petOrd - prefOrd) == 1;
    }

    private String getLabel(int score) {
        if (score >= 80) return "Excellent Match";
        if (score >= 60) return "Good Match";
        if (score >= 40) return "Fair Match";
        return "Possible Match";
    }
}