package com.elif.services.pet_profile.nutrition;

import com.elif.entities.pet_profile.PetProfile;
import com.elif.entities.pet_profile.PetNutritionProfile;
import com.elif.entities.pet_profile.enums.PetSpecies;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Constraint Validation Service - Validates meal plans against safety and preference constraints
 * Inspired by FAMMO's multi-layer constraint system (hard constraints = safety, soft = preferences)
 */
@Service
public class PetNutritionConstraintValidationService {

    // Toxic and forbidden ingredients for all pets
    private static final Set<String> UNIVERSAL_TOXIC_FOODS = Set.of(
            "chocolate", "cocoa", "caffeine",
            "grapes", "raisins", "sultanas",
            "onions", "garlic", "leeks", "chives",
            "xylitol", "avocado", "macadamia nuts",
            "alcohol", "hops", "mustard seeds",
            "salt", "sugar", "artificial sweeteners"
    );

    // Foods toxic primarily to dogs
    private static final Set<String> DOG_TOXIC_FOODS = Set.of(
            "raisin", "grape", "chocolate", "macadamia", "xylitol",
            "caffeine", "garlic", "onion", "avocado"
    );

    // Foods toxic primarily to cats
    private static final Set<String> CAT_TOXIC_FOODS = Set.of(
            "onion", "garlic", "chocolate", "xylitol", "caffeine",
            "grapes", "raisins", "raw eggs", "raw fish"
    );

    /**
     * Validate ingredient against pet's allergies and forbidden ingredients
     * Hard constraint - failure means meal plan cannot include this food
     */
    public ValidationResult validateIngredient(
            String ingredient,
            PetNutritionProfile nutritionProfile,
            PetSpecies species) {

        // Check for toxic substances
        if (isToxic(ingredient, species)) {
            return ValidationResult.builder()
                    .valid(false)
                    .constraintType("HARD")
                    .reason("Ingredient is toxic for " + species)
                    .severity("DANGEROUS")
                    .build();
        }

        // Check against pet's documented allergies
        if (nutritionProfile.getAllergies() != null) {
            if (matchesAllergy(ingredient, nutritionProfile.getAllergies())) {
                return ValidationResult.builder()
                        .valid(false)
                        .constraintType("HARD")
                        .reason("Pet has documented allergy to: " + ingredient)
                        .severity("DANGEROUS")
                        .build();
            }
        }

        // Check against forbidden ingredients
        if (nutritionProfile.getForbiddenIngredients() != null) {
            if (matchesAllergy(ingredient, nutritionProfile.getForbiddenIngredients())) {
                return ValidationResult.builder()
                        .valid(false)
                        .constraintType("HARD")
                        .reason("Ingredient in forbidden list: " + ingredient)
                        .severity("CAUTION")
                        .build();
            }
        }

        return ValidationResult.builder()
                .valid(true)
                .constraintType("NONE")
                .severity("SAFE")
                .build();
    }

    /**
     * Validate daily calorie range is within ±5% of DER (Daily Energy Requirement)
     * Hard constraint as per FAMMO
     */
    public ValidationResult validateCalorieRange(Integer mealPlanCalories, Integer derKcal) {
        int tolerance = Math.max(50, Math.round(derKcal * 0.05f)); // ±5%

        if (Math.abs(mealPlanCalories - derKcal) > tolerance) {
            return ValidationResult.builder()
                    .valid(false)
                    .constraintType("HARD")
                    .reason(String.format("Calories %d outside DER ±5%% range (%d-%d)",
                            mealPlanCalories, derKcal - tolerance, derKcal + tolerance))
                    .severity("CAUTION")
                    .build();
        }

        return ValidationResult.builder()
                .valid(true)
                .constraintType("HARD")
                .reason(String.format("Calorie requirement met: %d kcal (target: %d)", mealPlanCalories, derKcal))
                .severity("SAFE")
                .build();
    }

    /**
     * Validate nutrient balance meets species and life stage requirements
     * Hard constraint - ensures nutritional adequacy
     */
    public ValidationResult validateNutrientBalance(
            Integer proteinPercent,
            Integer fatPercent,
            Integer carbsPercent,
            PetSpecies species,
            boolean isGrowthStage) {

        // Check totals close to 100%
        int total = proteinPercent + fatPercent + carbsPercent;
        if (Math.abs(total - 100) > 5) {
            return ValidationResult.builder()
                    .valid(false)
                    .constraintType("HARD")
                    .reason("Macronutrient percentages don't sum to ~100%: " + total + "%")
                    .severity("CAUTION")
                    .build();
        }

        // AAFCO minimum standards
        if (species == PetSpecies.DOG) {
            int minProtein = isGrowthStage ? 22 : 18;
            if (proteinPercent < minProtein) {
                return ValidationResult.builder()
                        .valid(false)
                        .constraintType("HARD")
                        .reason(String.format("Dog protein %d%% below AAFCO minimum of %d%%",
                                proteinPercent, minProtein))
                        .severity("CAUTION")
                        .build();
            }
        }

        if (species == PetSpecies.CAT) {
            int minProtein = isGrowthStage ? 26 : 20;
            if (proteinPercent < minProtein) {
                return ValidationResult.builder()
                        .valid(false)
                        .constraintType("HARD")
                        .reason(String.format("Cat protein %d%% below AAFCO minimum of %d%%",
                                proteinPercent, minProtein))
                        .severity("CAUTION")
                        .build();
            }
        }

        return ValidationResult.builder()
                .valid(true)
                .constraintType("HARD")
                .reason("Nutrient balance meets species requirements")
                .severity("SAFE")
                .build();
    }

    /**
     * Validate soft constraints - owner preferences (not safety-critical)
     * These can be overridden if necessary, but AI should respect them
     */
    public List<String> validateSoftConstraints(
            String mealPlanApproach,  // e.g., "dry-food-primary", "mixed", "wet-food"
            PetNutritionProfile nutritionProfile) {

        List<String> appliedConstraints = new ArrayList<>();

        // Food preference
        if (nutritionProfile.getFoodPreference() != null && 
            !nutritionProfile.getFoodPreference().isEmpty()) {
            String preference = nutritionProfile.getFoodPreference().toLowerCase();

            if (preference.contains("wet") && mealPlanApproach.contains("dry")) {
                appliedConstraints.add("Owner prefers wet food - consider adding wet components");
            } else if (preference.contains("dry") && mealPlanApproach.contains("wet")) {
                appliedConstraints.add("Owner prefers dry food - consider adding kibble components");
            } else {
                appliedConstraints.add("Meal plan respects owner's food preference: " + preference);
            }
        }

        return appliedConstraints;
    }

    /**
     * Check if ingredient matches any documented allergy (case-insensitive, substring matching)
     */
    private boolean matchesAllergy(String ingredient, String allergiesString) {
        if (allergiesString == null || allergiesString.isEmpty()) {
            return false;
        }

        String ingredientLower = ingredient.toLowerCase().trim();
        String[] allergies = allergiesString.split(",");

        for (String allergy : allergies) {
            String allergyLower = allergy.toLowerCase().trim();
            if (ingredientLower.contains(allergyLower) || allergyLower.contains(ingredientLower)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if ingredient is toxic for the species
     */
    private boolean isToxic(String ingredient, PetSpecies species) {
        String ingredientLower = ingredient.toLowerCase();

        // Universal toxic foods
        for (String toxic : UNIVERSAL_TOXIC_FOODS) {
            if (ingredientLower.contains(toxic)) {
                return true;
            }
        }

        // Species-specific toxic foods
        if (species == PetSpecies.DOG) {
            for (String toxic : DOG_TOXIC_FOODS) {
                if (ingredientLower.contains(toxic)) {
                    return true;
                }
            }
        } else if (species == PetSpecies.CAT) {
            for (String toxic : CAT_TOXIC_FOODS) {
                if (ingredientLower.contains(toxic)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Inner class for validation result
     */
    public static class ValidationResult {
        private boolean valid;
        private String constraintType;  // HARD or SOFT
        private String reason;
        private String severity;        // SAFE, CAUTION, DANGEROUS

        public ValidationResult(boolean valid, String constraintType, String reason, String severity) {
            this.valid = valid;
            this.constraintType = constraintType;
            this.reason = reason;
            this.severity = severity;
        }

        public static ValidationResultBuilder builder() {
            return new ValidationResultBuilder();
        }

        public boolean isValid() {
            return valid;
        }

        public String getConstraintType() {
            return constraintType;
        }

        public String getReason() {
            return reason;
        }

        public String getSeverity() {
            return severity;
        }

        public static class ValidationResultBuilder {
            private boolean valid;
            private String constraintType;
            private String reason;
            private String severity;

            public ValidationResultBuilder valid(boolean valid) {
                this.valid = valid;
                return this;
            }

            public ValidationResultBuilder constraintType(String constraintType) {
                this.constraintType = constraintType;
                return this;
            }

            public ValidationResultBuilder reason(String reason) {
                this.reason = reason;
                return this;
            }

            public ValidationResultBuilder severity(String severity) {
                this.severity = severity;
                return this;
            }

            public ValidationResult build() {
                return new ValidationResult(valid, constraintType, reason, severity);
            }
        }
    }
}
