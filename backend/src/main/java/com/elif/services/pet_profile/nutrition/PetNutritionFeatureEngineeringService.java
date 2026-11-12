package com.elif.services.pet_profile.nutrition;

import com.elif.entities.pet_profile.PetProfile;
import com.elif.entities.pet_profile.enums.PetActivityLevel;
import com.elif.entities.pet_profile.enums.PetNutritionGoal;
import com.elif.entities.pet_profile.enums.PetSpecies;
import com.elif.dto.pet_profile.response.NutrientTargetDTO;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Feature Engineering Layer - Transforms raw pet data into nutritional targets using
 * veterinary nutrition science and evidence-based formulas (Adapted from FAMMO AI Engine).
 *
 * MER (Maintenance Energy Requirement) formula: 70 × (BW)^0.75 where BW is body weight in kg
 * This is then multiplied by activity factors to get DER (Daily Energy Requirement).
 */
@Service
public class PetNutritionFeatureEngineeringService {

    /**
     * Calculate Resting Energy Requirement (RER) using AAFCO formula
     * RER = 70 × (BW in kg)^0.75
     */
    public Integer calculateRER(BigDecimal weightKg) {
        if (weightKg == null || weightKg.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }
        double weight = weightKg.doubleValue();
        double rer = 70 * Math.pow(weight, 0.75);
        return Math.round((float) rer);
    }

    /**
     * Calculate Daily Energy Requirement (DER) by applying activity multiplier to RER
     */
    public Integer calculateDER(Integer rer, PetActivityLevel activityLevel) {
        double multiplier = getActivityMultiplier(activityLevel);
        return Math.round(rer * (float) multiplier);
    }

    /**
     * Activity multipliers based on AAFCO guidelines
     */
    private double getActivityMultiplier(PetActivityLevel activityLevel) {
        return switch (activityLevel) {
            case LOW -> 1.2;        // Sedentary, indoor only
            case MODERATE -> 1.5;   // Normal household activity
            case HIGH -> 1.8;       // Very active, working dogs, many outdoor activities
        };
    }

    /**
     * Calculate nutrient target percentages based on species and life stage
     * Uses AAFCO Adult Dog/Cat & Growth standards
     */
    public NutrientTargetDTO calculateNutrientTargets(
            PetProfile pet,
            Integer derKcal,
            PetNutritionGoal goal,
            boolean isGrowthStage) {

        double proteinPercent;
        double fatPercent;
        double carbsPercent;

        if (pet.getSpecies() == PetSpecies.DOG) {
            proteinPercent = isGrowthStage ? 22.0 : 18.0;  // AAFCO minimums
            fatPercent = isGrowthStage ? 8.0 : 5.0;
        } else if (pet.getSpecies() == PetSpecies.CAT) {
            proteinPercent = isGrowthStage ? 26.0 : 20.0;  // Cats need higher protein
            fatPercent = isGrowthStage ? 9.0 : 6.0;
        } else {
            proteinPercent = 18.0;
            fatPercent = 5.0;
        }

        // Adjust based on nutrition goal
        switch (goal) {
            case WEIGHT_LOSS:
                proteinPercent += 5;    // Increase protein to preserve muscle during weight loss
                fatPercent -= 2;        // Reduce fat
                break;
            case WEIGHT_GAIN:
                fatPercent += 3;        // Increase fat for weight gain
                break;
            case MEDICAL_DIET:
                // Medical diets would receive custom ratios from veterinarian
                break;
            case MAINTAIN:
                // Use standard ratios
                break;
        }

        // Carbs are remainder (typically 40-50%)
        carbsPercent = 100 - proteinPercent - fatPercent;

        // Calculate grams based on 4 kcal/g protein & carbs, 9 kcal/g fat
        int proteinGrams = Math.round((float) (derKcal * (proteinPercent / 100) / 4));
        int fatGrams = Math.round((float) (derKcal * (fatPercent / 100) / 9));
        int carbsGrams = Math.round((float) (derKcal * (carbsPercent / 100) / 4));

        String notes = deriveNutrientNotes(pet, goal, isGrowthStage);

        return NutrientTargetDTO.builder()
                .proteinPercent(String.format("%.0f%%", proteinPercent))
                .fatPercent(String.format("%.0f%%", fatPercent))
                .carbsPercent(String.format("%.0f%%", carbsPercent))
                .proteinGrams(proteinGrams)
                .fatGrams(fatGrams)
                .carbsGrams(carbsGrams)
                .notes(notes)
                .build();
    }

    private String deriveNutrientNotes(PetProfile pet, PetNutritionGoal goal, boolean isGrowthStage) {
        List<String> notes = new ArrayList<>();

        if (isGrowthStage) {
            notes.add("Growth stage formula with elevated protein and fat");
        }

        if (pet.getSpecies() == PetSpecies.CAT) {
            notes.add("High protein formula - cats are obligate carnivores");
        }

        return switch (goal) {
            case WEIGHT_LOSS -> "Weight loss formula with increased protein to preserve muscle";
            case WEIGHT_GAIN -> "Weight gain formula with increased fat content";
            case MEDICAL_DIET -> "Medical diet - consult veterinarian for specific ratios";
            case MAINTAIN -> notes.isEmpty() ? "Standard maintenance formula" : notes.get(0);
        };
    }

    /**
     * Calculate body condition score (1-9 scale) based on current vs target weight
     * This helps the AI engine determine if weight loss/gain is needed
     */
    public Double calculateBodyConditionScore(BigDecimal currentWeightKg, BigDecimal targetWeightKg) {
        if (currentWeightKg == null || targetWeightKg == null) {
            return 5.0; // Ideal condition
        }

        double current = currentWeightKg.doubleValue();
        double target = targetWeightKg.doubleValue();

        if (Math.abs(current - target) < 0.1) {
            return 5.0; // Ideal (BCS 5)
        }

        if (current > target * 1.2) {
            return 8.0; // Very obese (BCS 8-9)
        }
        if (current > target) {
            return 6.0; // Overweight (BCS 6-7)
        }
        if (current < target * 0.8) {
            return 2.0; // Very thin (BCS 1-2)
        }
        if (current < target) {
            return 4.0; // Underweight (BCS 3-4)
        }

        return 5.0;
    }

    /**
     * Determine health flags based on pet profile that affect nutrition planning
     */
    public List<String> identifyHealthFlags(
            PetProfile pet,
            BigDecimal currentWeight,
            BigDecimal targetWeight,
            PetNutritionGoal goal) {

        List<String> flags = new ArrayList<>();

        // Age-based flags
        int ageMonths = pet.calculateAgeInMonths();
        if (ageMonths < 12) {
            flags.add("growth_stage");
        } else if (ageMonths > 84) {
            flags.add("senior");
        }

        // Weight-based flags
        Double bcs = calculateBodyConditionScore(currentWeight, targetWeight);
        if (bcs >= 7.0) {
            flags.add("overweight");
        } else if (bcs <= 3.0) {
            flags.add("underweight");
        }

        // Goal-based flags
        if (goal == PetNutritionGoal.WEIGHT_LOSS) {
            flags.add("active_weight_loss");
        }

        return flags;
    }

    /**
     * Breed-specific feeding adjustments
     */
    public List<String> getBreedAdjustments(String breed, PetSpecies species) {
        List<String> adjustments = new ArrayList<>();

        if (breed == null) return adjustments;

        String breedLower = breed.toLowerCase();

        // Large breed dogs need calcium/phosphorus management
        if (species == PetSpecies.DOG && 
            (breedLower.contains("retriever") || breedLower.contains("shepherd") ||
             breedLower.contains("rottweiler") || breedLower.contains("mastiff") ||
             breedLower.contains("dane"))) {
            adjustments.add("Large breed - ensure proper calcium:phosphorus ratio (1.2:1)");
        }

        // Small breeds often need smaller kibble and higher calorie density
        if (species == PetSpecies.DOG &&
            (breedLower.contains("chihuahua") || breedLower.contains("pomeranian") ||
             breedLower.contains("toy"))) {
            adjustments.add("Small breed - use larger kibble size and monitor meal portions");
        }

        // Cats with sensitive digestion
        if (species == PetSpecies.CAT && breedLower.contains("siamese")) {
            adjustments.add("Siamese breed - may have sensitive digestion, monitor for reactions");
        }

        // Brachycephalic breeds
        if (species == PetSpecies.DOG &&
            (breedLower.contains("bulldog") || breedLower.contains("pug") ||
             breedLower.contains("boxer"))) {
            adjustments.add("Brachycephalic breed - ensure adequate hydration and monitor for digestion issues");
        }

        return adjustments;
    }
}
