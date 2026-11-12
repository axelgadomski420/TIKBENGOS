package com.elif.services.adoption.impl;

import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.AdoptionRequest;
import com.elif.entities.adoption.enums.AdoptionPetSize;
import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.services.adoption.interfaces.IAdoptionRequestScoringService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AdoptionRequestScoringService implements IAdoptionRequestScoringService {

    // ============================================================
    // MÉTHODE PRINCIPALE
    // ============================================================

    @Override
    public int calculateScore(AdoptionRequest request) {
        if (request == null || request.getPet() == null) return 0;

        int score = 0;
        AdoptionPet pet = request.getPet();

        score += scoreHousing(request, pet);
        score += scoreGarden(request, pet);
        score += scoreExperience(request, pet);
        score += scoreChildren(request, pet);
        score += scoreOtherPets(request, pet);
        score += scoreNotes(request);

        return Math.min(Math.max(score, 0), 100);
    }

    // ============================================================
    // GÉNÉRER LES RAISONS DU SCORE
    // ============================================================

    @Override
    public List<String> getScoreReasons(AdoptionRequest request) {
        List<String> reasons = new ArrayList<>();
        if (request == null || request.getPet() == null) return reasons;

        AdoptionPet pet = request.getPet();

        if ("FARM".equals(request.getHousingType())) {
            reasons.add("🌾 Lives on a farm — ideal for most animals");
        } else if ("HOUSE".equals(request.getHousingType())) {
            reasons.add("🏠 Lives in a house");
        } else if ("APARTMENT".equals(request.getHousingType())) {
            if (pet.getType() == AdoptionPetType.CHIEN &&
                    (pet.getSize() == AdoptionPetSize.GRAND || pet.getSize() == AdoptionPetSize.TRES_GRAND)) {
                reasons.add("⚠️ Apartment may be too small for a large dog");
            } else {
                reasons.add("🏢 Lives in an apartment");
            }
        }

        if (Boolean.TRUE.equals(request.getHasGarden())) {
            reasons.add("🌿 Has a garden — great for active animals");
        } else if (pet.getType() == AdoptionPetType.CHIEN) {
            reasons.add("⚠️ No garden — dog will need regular walks");
        }

        if ("EXPERT".equals(request.getExperienceLevel())) {
            reasons.add("🏆 Expert owner — can handle any animal");
        } else if ("EXPERIENCED".equals(request.getExperienceLevel()) ||
                "INTERMEDIATE".equals(request.getExperienceLevel())) {
            reasons.add("⭐ Has previous pet experience");
        } else if ("BEGINNER".equals(request.getExperienceLevel())) {
            if (hasSpecialNeeds(pet)) {
                reasons.add("⚠️ First-time owner with a pet requiring special care");
            } else {
                reasons.add("🌱 First-time owner — suitable for easy-care pets");
            }
        }

        if (Boolean.TRUE.equals(request.getHasChildren())) {
            if (pet.getType() == AdoptionPetType.CHIEN || pet.getType() == AdoptionPetType.CHAT) {
                reasons.add("👶 Has children — good socialization opportunity");
            } else {
                reasons.add("⚠️ Has children — may need extra supervision");
            }
        } else {
            reasons.add("✅ No young children — peaceful environment");
        }

        if (request.getOtherPets() != null && !request.getOtherPets().isBlank()) {
            reasons.add("🐾 Has other pets: " + request.getOtherPets());
        } else {
            reasons.add("✅ No other pets — animal will get full attention");
        }

        return reasons;
    }

    @Override
    public String getScoreLabel(int score) {
        if (score >= 85) return "Excellent";
        if (score >= 70) return "Very Good";
        if (score >= 55) return "Good";
        if (score >= 40) return "Fair";
        return "Low";
    }

    @Override
    public String getScoreColor(int score) {
        if (score >= 85) return "#38a169";
        if (score >= 70) return "#68d391";
        if (score >= 55) return "#d69e2e";
        if (score >= 40) return "#ed8936";
        return "#e53e3e";
    }

    // ============================================================
    // SCORING DÉTAILLÉ (VERSION ORIGINALE QUI DONNAIT 83)
    // ============================================================

    private int scoreHousing(AdoptionRequest req, AdoptionPet pet) {
        if (req.getHousingType() == null) return 10;

        return switch (req.getHousingType()) {
            case "FARM" -> 30;
            case "HOUSE" -> 22;
            case "APARTMENT" -> {
                if (pet.getType() == AdoptionPetType.CHIEN &&
                        (pet.getSize() == AdoptionPetSize.GRAND ||
                                pet.getSize() == AdoptionPetSize.TRES_GRAND)) {
                    yield 5;
                }
                yield 14;
            }
            default -> 10;
        };
    }

    private int scoreGarden(AdoptionRequest req, AdoptionPet pet) {
        if (Boolean.TRUE.equals(req.getHasGarden())) return 15;
        if (pet.getType() == AdoptionPetType.CHIEN) return -5;
        return 5;
    }

    private int scoreExperience(AdoptionRequest req, AdoptionPet pet) {
        if (req.getExperienceLevel() == null) return 10;

        return switch (req.getExperienceLevel()) {
            case "EXPERT" -> 25;
            case "EXPERIENCED" -> 20;
            case "INTERMEDIATE" -> 15;
            case "BEGINNER" -> hasSpecialNeeds(pet) ? 3 : 10;
            default -> 10;
        };
    }

    private int scoreChildren(AdoptionRequest req, AdoptionPet pet) {
        if (Boolean.TRUE.equals(req.getHasChildren())) {
            if (pet.getType() == AdoptionPetType.CHIEN ||
                    pet.getType() == AdoptionPetType.CHAT) {
                return 8;
            }
            if (pet.getType() == AdoptionPetType.REPTILE ||
                    pet.getType() == AdoptionPetType.RONGEUR) {
                return 3;
            }
            return 5;
        }
        return 10;
    }

    /** VERSION ORIGINALE - donnait 83 */
    private int scoreOtherPets(AdoptionRequest req, AdoptionPet pet) {
        boolean hasOtherPets = req.getOtherPets() != null && !req.getOtherPets().isBlank();

        if (!hasOtherPets) return 10;  // Pas d'autres animaux = 10 points

        if (pet.getType() == AdoptionPetType.CHAT || pet.getType() == AdoptionPetType.CHIEN) {
            return 5;  // Avec animaux = 5 points
        }
        return 3;
    }

    /** VERSION ORIGINALE - donnait 83 */
    private int scoreNotes(AdoptionRequest req) {
        if (req.getNotes() == null || req.getNotes().isBlank()) return 0;
        if (req.getNotes().length() > 100) return 5;
        return 3;
    }

    private boolean hasSpecialNeeds(AdoptionPet pet) {
        return pet.getSpecialNeeds() != null && !pet.getSpecialNeeds().isBlank();
    }
}