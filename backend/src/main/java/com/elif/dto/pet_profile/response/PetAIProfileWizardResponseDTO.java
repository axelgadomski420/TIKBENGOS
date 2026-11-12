package com.elif.dto.pet_profile.response;

import com.elif.entities.pet_profile.enums.PetGender;
import com.elif.entities.pet_profile.enums.PetSpecies;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Enhanced AI wizard response with structured, step-by-step data.
 * Designed for auto-filling forms without showing raw AI text.
 */
@Getter
@Builder
public class PetAIProfileWizardResponseDTO {
    
    // Step 1: Photo Analysis
    private PhotoAnalysisStep photoAnalysis;
    
    // Step 2: Basic Info (auto-filled)
    private BasicInfoStep basicInfo;
    
    // Step 3: Physical Characteristics
    private PhysicalCharacteristicsStep physicalCharacteristics;
    
    // Step 4: Health & Behavior Insights
    private HealthBehaviorStep healthBehavior;
    
    // Step 5: Recommendations
    private RecommendationsStep recommendations;
    
    // Metadata
    private Integer overallConfidence; // 0-100
    private String aiModel;
    private Boolean requiresUserReview;
    private List<String> uncertainFields; // Fields AI is not confident about
    
    @Getter
    @Builder
    public static class PhotoAnalysisStep {
        private Boolean photoQualityGood;
        private String photoQualityFeedback;
        private Boolean petClearlyVisible;
        private Boolean multiplePetsDetected;
        private String photoTips; // If photo quality is poor
    }
    
    @Getter
    @Builder
    public static class BasicInfoStep {
        private String suggestedName;
        private PetSpecies species;
        private String breed;
        private String breedConfidence; // "high", "medium", "low"
        private List<String> alternativeBreeds; // If uncertain
        private PetGender gender;
        private String genderConfidence;
        private LocalDate estimatedDateOfBirth;
        private String ageEstimateReasoning;
    }
    
    @Getter
    @Builder
    public static class PhysicalCharacteristicsStep {
        private BigDecimal estimatedWeightKg;
        private String weightRange; // e.g., "10-12 kg"
        private String sizeCategory; // "small", "medium", "large", "giant"
        private String coatType; // "short", "medium", "long", "curly", "wire"
        private List<String> coatColors;
        private String bodyCondition; // "underweight", "ideal", "overweight"
        private List<String> distinctiveFeatures; // e.g., "floppy ears", "curled tail"
    }
    
    @Getter
    @Builder
    public static class HealthBehaviorStep {
        private String apparentHealthStatus; // "healthy", "needs_checkup", "concerns"
        private List<String> visibleHealthConcerns;
        private String estimatedEnergyLevel; // "low", "moderate", "high", "very_high"
        private String temperamentGuess; // "calm", "playful", "alert", "shy"
        private List<String> behavioralNotes;
    }
    
    @Getter
    @Builder
    public static class RecommendationsStep {
        private Integer suggestedDailyCalories;
        private String dietType; // "puppy", "adult", "senior", "weight_management"
        private List<String> exerciseRecommendations;
        private List<String> groomingNeeds;
        private List<String> healthCheckReminders;
        private String specialCareNotes;
    }
}
