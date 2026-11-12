package com.elif.dto.events.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO retourné à l'admin pour visualiser un dossier de compétition.
 */
@Data
@Builder
public class PetCompetitionEntryResponse {

    private Long   id;
    private Long   participantId;
    private Long   eventId;
    private String eventTitle;

    // Infos utilisateur
    private Long   userId;
    private String ownerName;
    private String ownerEmail;

    // Infos animal
    private Long    petId;
    private String  petName;
    private String  species;
    private String  breed;
    private Integer ageMonths;
    private Double  weightKg;
    private String  sex;
    private String  color;
    private Boolean isVaccinated;
    private Boolean hasLicense;
    private Boolean hasMedicalCert;
    private Integer experienceLevel;
    private String  additionalInfo;

    // Score et verdict
    private Integer eligibilityScore;
    private String  eligibilityVerdict;  // "ELIGIBLE", "WARNING", "INELIGIBLE"
    private String  satisfiedRules;
    private String  warnings;

    // Classement
    private Integer ranking;  // Position dans la compétition

    // Statut inscription
    private String participantStatus;  // "CONFIRMED", "PENDING", "CANCELLED"

    private LocalDateTime createdAt;

    // ─── Méthodes utilitaires ─────────────────────────────────────────

    public boolean isEligible() {
        return "ELIGIBLE".equals(eligibilityVerdict);
    }

    public boolean hasWarnings() {
        return "WARNING".equals(eligibilityVerdict);
    }

    public boolean isRejected() {
        return "INELIGIBLE".equals(eligibilityVerdict);
    }

    public String getScoreLabel() {
        if (eligibilityScore == null) return "N/A";
        if (eligibilityScore >= 80) return "Excellent";
        if (eligibilityScore >= 60) return "Good";
        if (eligibilityScore >= 40) return "Average";
        return "Low";
    }

    public String getStatusBadge() {
        if (isRejected()) return "❌ Rejected";
        if (hasWarnings()) return "⚠️ Warning";
        return "✅ Eligible";
    }
}