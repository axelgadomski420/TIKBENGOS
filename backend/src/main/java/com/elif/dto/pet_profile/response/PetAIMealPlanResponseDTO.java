package com.elif.dto.pet_profile.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PetAIMealPlanResponseDTO {
    // ──────── Input Layer Summary ────────
    private Long petId;
    private String petName;
    private String petBreed;
    private String species;             // DOG, CAT, etc.
    
    // ──────── Feature Engineering Output ────────
    private Double bodyConditionScore;  // 1-9 BCS scale
    private Integer merKcal;            // Resting Energy Requirement
    private Integer derKcal;            // Daily Energy Requirement (MER * activity multiplier)
    private NutrientTargetDTO nutrientTargets;
    
    // ──────── Health Flags & Breed Adjustments ────────
    private List<String> healthFlags;   // e.g., ["overweight", "senior", "sensitive digestion"]
    private List<String> breedAdjustments; // Breed-specific feeding notes
    
    // ──────── AI Decision Layer Output ────────
    private List<MealPlanOptionDTO> options; // Usually 2 diverse options
    private List<FeedingScheduleItemDTO> feedingSchedule;
    
    // ──────── Constraints Applied ────────
    private List<String> hardConstraintsApplied; // What was enforced
    private List<String> softConstraintsApplied; // Preferences honored
    
    // ──────── Safety Notes ────────
    private List<String> safetyNotes;   // e.g., "Ensure fresh water at all times"
    private List<String> transitionGuidance; // How to switch from current diet
    private List<String> monitoringAlerts; // What to watch for (e.g., allergy symptoms)
    
    // ──────── Metadata ────────
    private String generatedAt;         // ISO timestamp
    private String allergyStatus;       // "SAFE", "CAUTION", "DANGEROUS"
    private Integer confidenceScore;    // 1-100
}
