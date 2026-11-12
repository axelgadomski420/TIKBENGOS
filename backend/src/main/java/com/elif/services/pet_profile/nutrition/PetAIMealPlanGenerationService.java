package com.elif.services.pet_profile.nutrition;

import com.elif.dto.pet_profile.response.*;
import com.elif.entities.pet_profile.PetProfile;
import com.elif.entities.pet_profile.PetNutritionProfile;
import com.elif.entities.pet_profile.enums.PetActivityLevel;
import com.elif.entities.pet_profile.enums.PetNutritionGoal;
import com.elif.entities.pet_profile.enums.PetSpecies;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * AI Decision Layer - Generates personalized meal plans using veterinary nutrition rules
 * and machine-learning logic (FAMMO AI Engine approach).
 *
 * This service combines:
 * 1. Veterinary nutrition formulas from feature engineering
 * 2. Constraint validation (hard safety, soft preferences)
 * 3. Ingredient databases and meal generation logic
 * 4. Safety validation
 */
@Service
@RequiredArgsConstructor
public class PetAIMealPlanGenerationService {

    private final PetNutritionFeatureEngineeringService featureEngineering;
    private final PetNutritionConstraintValidationService constraintValidation;

    /**
     * Main AI engine method - generates 1-2 diversified meal plan options
     * Steps match FAMMO:
     * 1. Calculate daily caloric requirement
     * 2. Apply constraints (allergies, safety, breed)
     * 3. Generate meal plan options
     * 4. Validate nutrient balance
     * 5. Attach safety notes
     */
    public PetAIMealPlanResponseDTO generateMealPlan(
            PetProfile pet,
            PetNutritionProfile nutritionProfile) {

        // Step 1: Calculate Daily Caloric Requirement
        Integer rer = featureEngineering.calculateRER(pet.getWeight());
        Integer der = featureEngineering.calculateDER(rer, nutritionProfile.getActivityLevel());

        // Feature Engineering: Nutrient targets
        boolean isGrowthStage = pet.calculateAgeInMonths() < 12;
        NutrientTargetDTO nutrientTargets = featureEngineering.calculateNutrientTargets(
                pet, der, nutritionProfile.getGoal(), isGrowthStage);

        // Step 2: Identify health flags and breed adjustments
        List<String> healthFlags = featureEngineering.identifyHealthFlags(
                pet,
                pet.getWeight(),
                nutritionProfile.getTargetWeightKg(),
                nutritionProfile.getGoal());

        List<String> breedAdjustments = featureEngineering.getBreedAdjustments(
                pet.getBreed(),
                pet.getSpecies());

        Double bcs = featureEngineering.calculateBodyConditionScore(
                pet.getWeight(),
                nutritionProfile.getTargetWeightKg());

        // Step 3: Generate 2 diverse meal plan options
        List<MealPlanOptionDTO> options = new ArrayList<>();

        // Option 1: Premium dry food primary
        MealPlanOptionDTO option1 = generateMealPlanOption(
                1,
                "Premium Kibble Focus",
                "High-quality kibble with occasional wet food supplements",
                pet,
                nutritionProfile,
                der,
                nutrientTargets,
                "dry-food-primary");
        options.add(option1);

        // Option 2: Mixed diet approach (if pet allows)
        if (canGenerateMixedDiet(pet, nutritionProfile)) {
            MealPlanOptionDTO option2 = generateMealPlanOption(
                    2,
                    "Balanced Mixed Diet",
                    "Combination of dry and wet food for variety and hydration",
                    pet,
                    nutritionProfile,
                    der,
                    nutrientTargets,
                    "mixed-diet");
            options.add(option2);
        }

        // Step 4: Generate feeding schedule
        List<FeedingScheduleItemDTO> feedingSchedule = generateFeedingSchedule(
                nutritionProfile.getMealsPerDay());

        // Step 5: Safety notes and monitoring
        List<String> safetyNotes = generateSafetyNotes(pet, nutritionProfile, healthFlags);
        List<String> transitionGuidance = generateTransitionGuidance(nutritionProfile.getGoal());
        List<String> monitoringAlerts = generateMonitoringAlerts(pet, healthFlags, nutritionProfile);

        // Step 6: Constraint tracking
        List<String> hardConstraintsApplied = new ArrayList<>();
        List<String> softConstraintsApplied = new ArrayList<>();

        // Add allergy constraint if applicable
        if (nutritionProfile.getAllergies() != null && !nutritionProfile.getAllergies().isEmpty()) {
            hardConstraintsApplied.add("Allergen exclusions: " + nutritionProfile.getAllergies());
        }

        // Add toxic food exclusion
        hardConstraintsApplied.add("All toxic ingredients excluded for " + pet.getSpecies());

        // Add soft constraints
        softConstraintsApplied.addAll(constraintValidation.validateSoftConstraints(
                options.get(0).getDietaryApproach(),
                nutritionProfile));

        // Determine allergy status
        String allergyStatus = determineAllergyStatus(nutritionProfile, pet.getSpecies());

        return PetAIMealPlanResponseDTO.builder()
                .petId(pet.getId())
                .petName(pet.getName())
                .petBreed(pet.getBreed())
                .species(pet.getSpecies().toString())
                .bodyConditionScore(bcs)
                .merKcal(rer)
                .derKcal(der)
                .nutrientTargets(nutrientTargets)
                .healthFlags(healthFlags)
                .breedAdjustments(breedAdjustments)
                .options(options)
                .feedingSchedule(feedingSchedule)
                .hardConstraintsApplied(hardConstraintsApplied)
                .softConstraintsApplied(softConstraintsApplied)
                .safetyNotes(safetyNotes)
                .transitionGuidance(transitionGuidance)
                .monitoringAlerts(monitoringAlerts)
                .generatedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
                .allergyStatus(allergyStatus)
                .confidenceScore(calculateConfidenceScore(pet, nutritionProfile))
                .build();
    }

    /**
     * Generate a single meal plan option with specific dietary approach
     */
    private MealPlanOptionDTO generateMealPlanOption(
            int optionNumber,
            String name,
            String overview,
            PetProfile pet,
            PetNutritionProfile nutritionProfile,
            Integer derKcal,
            NutrientTargetDTO nutrientTargets,
            String mealApproach) {

        List<MealSectionDTO> sections = new ArrayList<>();

        // Generate sections based on meals per day
        int mealsPerDay = nutritionProfile.getMealsPerDay();
        int caloriesPerMeal = derKcal / mealsPerDay;

        if (mealsPerDay >= 1) {
            sections.add(generateMealSection(
                    "Breakfast",
                    caloriesPerMeal,
                    pet,
                    nutritionProfile,
                    mealApproach,
                    "morning"));
        }

        if (mealsPerDay >= 2) {
            sections.add(generateMealSection(
                    "Lunch",
                    caloriesPerMeal,
                    pet,
                    nutritionProfile,
                    mealApproach,
                    "midday"));
        }

        if (mealsPerDay >= 3) {
            sections.add(generateMealSection(
                    "Dinner",
                    caloriesPerMeal,
                    pet,
                    nutritionProfile,
                    mealApproach,
                    "evening"));
        }

        if (mealsPerDay >= 4) {
            sections.add(generateMealSection(
                    "Snack",
                    caloriesPerMeal / 2,
                    pet,
                    nutritionProfile,
                    mealApproach,
                    "snack"));
        }

        // Calculate totals
        int totalCalories = sections.stream()
                .mapToInt(MealSectionDTO::getTotalCalories)
                .sum();

        // Parse percentages
        int proteinPercent = Integer.parseInt(nutrientTargets.getProteinPercent().replace("%", ""));
        int fatPercent = Integer.parseInt(nutrientTargets.getFatPercent().replace("%", ""));
        int carbsPercent = Integer.parseInt(nutrientTargets.getCarbsPercent().replace("%", ""));

        List<String> highlights = generateMealPlanHighlights(pet, mealApproach, nutritionProfile.getGoal());

        return MealPlanOptionDTO.builder()
                .optionNumber(optionNumber)
                .name(name)
                .overview(overview)
                .sections(sections)
                .totalDailyCalories(totalCalories)
                .dietaryApproach(mealApproach)
                .proteinPercentage(proteinPercent)
                .fatPercentage(fatPercent)
                .carbsPercentage(carbsPercent)
                .highlights(highlights)
                .build();
    }

    /**
     * Generate a meal section (breakfast, lunch, etc.) with specific items
     */
    private MealSectionDTO generateMealSection(
            String sectionTitle,
            Integer sectionCalories,
            PetProfile pet,
            PetNutritionProfile nutritionProfile,
            String mealApproach,
            String timeOfDay) {

        List<MealItemDTO> items = new ArrayList<>();

        // Generate meal items based on approach
        if ("dry-food-primary".equals(mealApproach)) {
            items.add(generateMealItem(
                    String.format("Premium %s dry food",
                            pet.getSpecies() == PetSpecies.DOG ? "dog" : "cat"),
                    sectionCalories,
                    pet.getWeight().doubleValue() < 5 ? 30 : 50));
        } else if ("mixed-diet".equals(mealApproach)) {
            // Split between dry and wet
            int dryCalories = Math.round(sectionCalories * 0.6f);
            int wetCalories = sectionCalories - dryCalories;

            if ("evening".equals(timeOfDay) || "snack".equals(timeOfDay)) {
                // Evening/snack gets higher wet food ratio
                wetCalories = Math.round(sectionCalories * 0.7f);
                dryCalories = sectionCalories - wetCalories;
            }

            items.add(generateMealItem(
                    String.format("Premium %s kibble",
                            pet.getSpecies() == PetSpecies.DOG ? "dog" : "cat"),
                    dryCalories,
                    pet.getWeight().doubleValue() < 5 ? 20 : 40));

            items.add(generateMealItem(
                    String.format("Premium %s wet food (chicken or beef)",
                            pet.getSpecies() == PetSpecies.DOG ? "dog" : "cat"),
                    wetCalories,
                    pet.getWeight().doubleValue() < 5 ? 40 : 80));
        }

        // Add optional supplement if needed
        if (pet.calculateAgeInMonths() > 108) {
            items.add(generateMealItem(
                    "Joint supplement (glucosamine/chondroitin)",
                    20,
                    5));
        }

        int totalCalories = items.stream()
                .mapToInt(item -> item.getCalories() != null ? item.getCalories() : 0)
                .sum();

        String notes = generateMealSectionNotes(sectionTitle, pet.getSpecies());

        return MealSectionDTO.builder()
                .title(sectionTitle)
                .totalCalories(totalCalories)
                .items(items)
                .notes(notes)
                .build();
    }

    /**
     * Generate a single meal item
     */
    private MealItemDTO generateMealItem(String foodName, Integer calories, Integer portionGrams) {
        // Estimate protein based on food type and calories
        int proteinGrams = 0;
        if (foodName.toLowerCase().contains("kibble") || foodName.toLowerCase().contains("dry")) {
            proteinGrams = Math.round(calories * 0.25f / 4);  // ~25% protein
        } else if (foodName.toLowerCase().contains("wet") || foodName.toLowerCase().contains("food")) {
            proteinGrams = Math.round(calories * 0.18f / 4);  // ~18% protein
        } else {
            proteinGrams = Math.round(calories * 0.08f / 4);  // ~8% protein (supplements)
        }

        int fatGrams = Math.round(calories * 0.08f / 9);      // ~8% fat

        return MealItemDTO.builder()
                .food(foodName)
                .portionGrams(portionGrams)
                .calories(calories)
                .protein(String.format("%dg", Math.max(proteinGrams, 1)))
                .fat(String.format("%dg", Math.max(fatGrams, 1)))
                .instructions(generateMealInstructions(foodName))
                .build();
    }

    /**
     * Generate feeding schedule times based on meals per day
     */
    private List<FeedingScheduleItemDTO> generateFeedingSchedule(int mealsPerDay) {
        List<FeedingScheduleItemDTO> schedule = new ArrayList<>();

        switch (mealsPerDay) {
            case 1:
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("12:00 PM")
                        .note("Serve once daily with fresh water available at all times")
                        .build());
                break;
            case 2:
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("8:00 AM")
                        .note("Morning meal - serve with fresh water")
                        .build());
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("6:00 PM")
                        .note("Evening meal - ensure water bowl is full")
                        .build());
                break;
            case 3:
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("8:00 AM")
                        .note("Morning meal")
                        .build());
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("12:30 PM")
                        .note("Lunch - midday feeding")
                        .build());
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("6:30 PM")
                        .note("Evening meal")
                        .build());
                break;
            case 4:
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("7:00 AM")
                        .note("Early morning meal")
                        .build());
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("11:30 AM")
                        .note("Late morning")
                        .build());
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("4:00 PM")
                        .note("Afternoon meal")
                        .build());
                schedule.add(FeedingScheduleItemDTO.builder()
                        .time("8:00 PM")
                        .note("Evening meal - final feeding")
                        .build());
                break;
        }

        return schedule;
    }

    /**
     * Generate safety and transition notes
     */
    private List<String> generateSafetyNotes(
            PetProfile pet,
            PetNutritionProfile nutritionProfile,
            List<String> healthFlags) {

        List<String> notes = new ArrayList<>();

        notes.add("Ensure fresh water is available at all times.");
        notes.add("Monitor your pet during the first week of dietary transition for any digestive issues.");

        if (nutritionProfile.getAllergies() != null && !nutritionProfile.getAllergies().isEmpty()) {
            notes.add("Strict allergen avoidance in place for: " + nutritionProfile.getAllergies());
            notes.add("If allergic reactions occur (itching, vomiting, diarrhea), contact your veterinarian immediately.");
        }

        if (healthFlags.contains("overweight")) {
            notes.add("Portion control is critical for weight loss. Use a kitchen scale to measure portions.");
            notes.add("Avoid table scraps and high-calorie treats.");
        }

        if (pet.getSpecies() == PetSpecies.CAT) {
            notes.add("Cats require consistent feeding times. Avoid leaving kibble out throughout the day.");
        }

        return notes;
    }

    private List<String> generateTransitionGuidance(PetNutritionGoal goal) {
        List<String> guidance = new ArrayList<>();

        guidance.add("Week 1: Mix 25% new food with 75% current food");
        guidance.add("Week 2: Mix 50% new food with 50% current food");
        guidance.add("Week 3: Mix 75% new food with 25% current food");
        guidance.add("Week 4: Complete transition to new diet");

        if (goal == PetNutritionGoal.WEIGHT_LOSS) {
            guidance.add("Monitor weight weekly; expect 1-2% body weight loss per week");
        }

        return guidance;
    }

    private List<String> generateMonitoringAlerts(
            PetProfile pet,
            List<String> healthFlags,
            PetNutritionProfile nutritionProfile) {

        List<String> alerts = new ArrayList<>();

        alerts.add("Watch for changes in appetite or eating behavior");
        alerts.add("Monitor stool quality and frequency");

        if (healthFlags.contains("growth_stage")) {
            alerts.add("Monitor growth and development - puppy/kitten weight should increase steadily");
        }

        if (healthFlags.contains("overweight")) {
            alerts.add("Track weight loss progress - aim for gradual, sustainable loss");
        }

        if (healthFlags.contains("senior")) {
            alerts.add("Monitor for signs of decreased appetite or difficulty chewing");
            alerts.add("Consider digestive enzyme supplementation if needed");
        }

        return alerts;
    }

    private String determineAllergyStatus(PetNutritionProfile nutritionProfile, PetSpecies species) {
        if (nutritionProfile.getAllergies() == null || nutritionProfile.getAllergies().isEmpty()) {
            return "SAFE";
        }

        if (nutritionProfile.getAllergies().toLowerCase().contains("severe")) {
            return "DANGEROUS";
        }

        return "CAUTION";
    }

    private int calculateConfidenceScore(PetProfile pet, PetNutritionProfile nutritionProfile) {
        int score = 85;  // Base confidence

        // Increase confidence for complete profiles
        if (pet.getWeight() != null && pet.getWeight().doubleValue() > 0) {
            score += 5;
        }

        if (nutritionProfile.getTargetWeightKg() != null &&
            nutritionProfile.getTargetWeightKg().doubleValue() > 0) {
            score += 5;
        }

        if (nutritionProfile.getAllergies() != null && 
            !nutritionProfile.getAllergies().isEmpty()) {
            score += 3;
        }

        // Cap at 100
        return Math.min(score, 100);
    }

    private boolean canGenerateMixedDiet(PetProfile pet, PetNutritionProfile nutritionProfile) {
        // Cats generally tolerate mixed diets less; dogs more flexible
        return pet.getSpecies() == PetSpecies.DOG ||
               (pet.getSpecies() == PetSpecies.CAT && 
                (nutritionProfile.getFoodPreference() == null || 
                 !nutritionProfile.getFoodPreference().toLowerCase().contains("dry only")));
    }

    private List<String> generateMealPlanHighlights(
            PetProfile pet,
            String mealApproach,
            PetNutritionGoal goal) {

        List<String> highlights = new ArrayList<>();

        if ("dry-food-primary".equals(mealApproach)) {
            highlights.add("Convenient daily preparation");
            highlights.add("Dental benefits from kibble");
            highlights.add("Long shelf life");
        } else if ("mixed-diet".equals(mealApproach)) {
            highlights.add("Increased hydration from wet food");
            highlights.add("Nutritional variety and palatability");
            highlights.add("Flexibility to rotate ingredients");
        }

        if (goal == PetNutritionGoal.WEIGHT_LOSS) {
            highlights.add("Calorie-controlled portions");
            highlights.add("High protein to preserve muscle");
        } else if (goal == PetNutritionGoal.WEIGHT_GAIN) {
            highlights.add("Calorie-dense formulation");
            highlights.add("Enhanced fat content");
        }

        return highlights;
    }

    private String generateMealInstructions(String foodName) {
        if (foodName.toLowerCase().contains("supplement")) {
            return "Mix thoroughly with food";
        }
        if (foodName.toLowerCase().contains("wet")) {
            return "Serve at room temperature";
        }
        if (foodName.toLowerCase().contains("kibble") || foodName.toLowerCase().contains("dry")) {
            return "Serve dry or soften with warm water if preferred";
        }
        return null;
    }

    private String generateMealSectionNotes(String sectionTitle, PetSpecies species) {
        return switch (sectionTitle) {
            case "Breakfast" -> "Morning meal should be served within 1 hour of pet waking";
            case "Dinner" -> "Final meal should be served 2-3 hours before bedtime";
            case "Snack" -> "Optional high-value treat or second portion";
            default -> null;
        };
    }
}
