package com.elif.dto.adoption.response;

import com.elif.entities.adoption.enums.RequestStatus;
import java.time.LocalDateTime;
import java.util.List;  // ✅ AJOUTER

public class AdoptionRequestResponseDTO {

    private Long id;
    private Long petId;
    private String petName;
    private AdoptionPetResponseDTO petDetails;
    private Long adopterId;
    private String adopterName;
    private RequestStatus status;
    private LocalDateTime dateRequested;
    private LocalDateTime approvedDate;
    private String notes;
    private String rejectionReason;
    private String housingType;
    private Boolean hasGarden;
    private Boolean hasChildren;
    private String otherPets;
    private String experienceLevel;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long shelterId;

    // ============================================================
    // ✅ AJOUTER LES CHAMPS POUR LE SCORE DE COMPATIBILITÉ
    // ============================================================
    private Integer compatibilityScore;      // Score 0-100
    private String compatibilityLabel;       // Excellent, Very Good, Good, Fair, Low
    private String compatibilityColor;       // Code couleur hexadécimal
    private List<String> scoreReasons;       // Raisons du score

    // ============================================================
    // GETTERS ET SETTERS EXISTANTS
    // ============================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPetId() {
        return petId;
    }

    public void setPetId(Long petId) {
        this.petId = petId;
    }

    public String getPetName() {
        return petName;
    }

    public void setPetName(String petName) {
        this.petName = petName;
    }

    public AdoptionPetResponseDTO getPetDetails() {
        return petDetails;
    }

    public void setPetDetails(AdoptionPetResponseDTO petDetails) {
        this.petDetails = petDetails;
    }

    public Long getAdopterId() {
        return adopterId;
    }

    public void setAdopterId(Long adopterId) {
        this.adopterId = adopterId;
    }

    public String getAdopterName() {
        return adopterName;
    }

    public void setAdopterName(String adopterName) {
        this.adopterName = adopterName;
    }

    public RequestStatus getStatus() {
        return status;
    }

    public void setStatus(RequestStatus status) {
        this.status = status;
    }

    public LocalDateTime getDateRequested() {
        return dateRequested;
    }

    public void setDateRequested(LocalDateTime dateRequested) {
        this.dateRequested = dateRequested;
    }

    public LocalDateTime getApprovedDate() {
        return approvedDate;
    }

    public void setApprovedDate(LocalDateTime approvedDate) {
        this.approvedDate = approvedDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getHousingType() {
        return housingType;
    }

    public void setHousingType(String housingType) {
        this.housingType = housingType;
    }

    public Boolean getHasGarden() {
        return hasGarden;
    }

    public void setHasGarden(Boolean hasGarden) {
        this.hasGarden = hasGarden;
    }

    public Boolean getHasChildren() {
        return hasChildren;
    }

    public void setHasChildren(Boolean hasChildren) {
        this.hasChildren = hasChildren;
    }

    public String getOtherPets() {
        return otherPets;
    }

    public void setOtherPets(String otherPets) {
        this.otherPets = otherPets;
    }

    public String getExperienceLevel() {
        return experienceLevel;
    }

    public void setExperienceLevel(String experienceLevel) {
        this.experienceLevel = experienceLevel;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getShelterId() {
        return shelterId;
    }

    public void setShelterId(Long shelterId) {
        this.shelterId = shelterId;
    }

    // ============================================================
    // ✅ GETTERS ET SETTERS POUR LE SCORE
    // ============================================================

    public Integer getCompatibilityScore() {
        return compatibilityScore;
    }

    public void setCompatibilityScore(Integer compatibilityScore) {
        this.compatibilityScore = compatibilityScore;
    }

    public String getCompatibilityLabel() {
        return compatibilityLabel;
    }

    public void setCompatibilityLabel(String compatibilityLabel) {
        this.compatibilityLabel = compatibilityLabel;
    }

    public String getCompatibilityColor() {
        return compatibilityColor;
    }

    public void setCompatibilityColor(String compatibilityColor) {
        this.compatibilityColor = compatibilityColor;
    }

    public List<String> getScoreReasons() {
        return scoreReasons;
    }

    public void setScoreReasons(List<String> scoreReasons) {
        this.scoreReasons = scoreReasons;
    }

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final AdoptionRequestResponseDTO dto = new AdoptionRequestResponseDTO();

        public Builder id(Long id) {
            dto.setId(id);
            return this;
        }

        public Builder petId(Long petId) {
            dto.setPetId(petId);
            return this;
        }

        public Builder petName(String petName) {
            dto.setPetName(petName);
            return this;
        }

        public Builder petDetails(AdoptionPetResponseDTO petDetails) {
            dto.setPetDetails(petDetails);
            return this;
        }

        public Builder adopterId(Long adopterId) {
            dto.setAdopterId(adopterId);
            return this;
        }

        public Builder adopterName(String adopterName) {
            dto.setAdopterName(adopterName);
            return this;
        }

        public Builder status(RequestStatus status) {
            dto.setStatus(status);
            return this;
        }

        public Builder dateRequested(LocalDateTime dateRequested) {
            dto.setDateRequested(dateRequested);
            return this;
        }

        public Builder approvedDate(LocalDateTime approvedDate) {
            dto.setApprovedDate(approvedDate);
            return this;
        }

        public Builder notes(String notes) {
            dto.setNotes(notes);
            return this;
        }

        public Builder rejectionReason(String rejectionReason) {
            dto.setRejectionReason(rejectionReason);
            return this;
        }

        public Builder housingType(String housingType) {
            dto.setHousingType(housingType);
            return this;
        }

        public Builder hasGarden(Boolean hasGarden) {
            dto.setHasGarden(hasGarden);
            return this;
        }

        public Builder hasChildren(Boolean hasChildren) {
            dto.setHasChildren(hasChildren);
            return this;
        }

        public Builder otherPets(String otherPets) {
            dto.setOtherPets(otherPets);
            return this;
        }

        public Builder experienceLevel(String experienceLevel) {
            dto.setExperienceLevel(experienceLevel);
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            dto.setCreatedAt(createdAt);
            return this;
        }

        public Builder updatedAt(LocalDateTime updatedAt) {
            dto.setUpdatedAt(updatedAt);
            return this;
        }

        public Builder shelterId(Long shelterId) {
            dto.setShelterId(shelterId);
            return this;
        }

        // ✅ AJOUTER LES MÉTHODES BUILDER POUR LE SCORE
        public Builder compatibilityScore(Integer compatibilityScore) {
            dto.setCompatibilityScore(compatibilityScore);
            return this;
        }

        public Builder compatibilityLabel(String compatibilityLabel) {
            dto.setCompatibilityLabel(compatibilityLabel);
            return this;
        }

        public Builder compatibilityColor(String compatibilityColor) {
            dto.setCompatibilityColor(compatibilityColor);
            return this;
        }

        public Builder scoreReasons(List<String> scoreReasons) {
            dto.setScoreReasons(scoreReasons);
            return this;
        }

        public AdoptionRequestResponseDTO build() {
            return dto;
        }
    }
}