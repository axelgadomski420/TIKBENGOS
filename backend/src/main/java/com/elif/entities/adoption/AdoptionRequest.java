package com.elif.entities.adoption;

import com.elif.entities.adoption.enums.RequestStatus;
import com.elif.entities.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;  // ← AJOUTER CET IMPORT
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "adoption_request")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AdoptionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    @JsonIgnore  // ← AJOUTER CETTE ANNOTATION
    private AdoptionPet pet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adopter_id", nullable = false)
    private User adopter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(name = "date_requested", updatable = false)
    private LocalDateTime dateRequested = LocalDateTime.now();

    @Column(name = "approved_date")
    private LocalDateTime approvedDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "housing_type", length = 50)
    private String housingType;

    @Column(name = "has_garden")
    private Boolean hasGarden;

    @Column(name = "has_children")
    private Boolean hasChildren;

    @Column(name = "other_pets", columnDefinition = "TEXT")
    private String otherPets;

    @Column(name = "experience_level", length = 50)
    private String experienceLevel;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ============================================================
    // CONSTRUCTEURS
    // ============================================================

    public AdoptionRequest() {
    }

    public AdoptionRequest(Long id, AdoptionPet pet, User adopter, RequestStatus status,
                           LocalDateTime dateRequested, LocalDateTime approvedDate, String notes,
                           String rejectionReason, String housingType, Boolean hasGarden,
                           Boolean hasChildren, String otherPets, String experienceLevel,
                           LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.pet = pet;
        this.adopter = adopter;
        this.status = status;
        this.dateRequested = dateRequested;
        this.approvedDate = approvedDate;
        this.notes = notes;
        this.rejectionReason = rejectionReason;
        this.housingType = housingType;
        this.hasGarden = hasGarden;
        this.hasChildren = hasChildren;
        this.otherPets = otherPets;
        this.experienceLevel = experienceLevel;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public AdoptionPet getPet() {
        return pet;
    }

    public void setPet(AdoptionPet pet) {
        this.pet = pet;
    }

    public User getAdopter() {
        return adopter;
    }

    public void setAdopter(User adopter) {
        this.adopter = adopter;
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

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private AdoptionPet pet;
        private User adopter;
        private RequestStatus status = RequestStatus.PENDING;
        private LocalDateTime dateRequested = LocalDateTime.now();
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

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder pet(AdoptionPet pet) {
            this.pet = pet;
            return this;
        }

        public Builder adopter(User adopter) {
            this.adopter = adopter;
            return this;
        }

        public Builder status(RequestStatus status) {
            this.status = status;
            return this;
        }

        public Builder dateRequested(LocalDateTime dateRequested) {
            this.dateRequested = dateRequested;
            return this;
        }

        public Builder approvedDate(LocalDateTime approvedDate) {
            this.approvedDate = approvedDate;
            return this;
        }

        public Builder notes(String notes) {
            this.notes = notes;
            return this;
        }

        public Builder rejectionReason(String rejectionReason) {
            this.rejectionReason = rejectionReason;
            return this;
        }

        public Builder housingType(String housingType) {
            this.housingType = housingType;
            return this;
        }

        public Builder hasGarden(Boolean hasGarden) {
            this.hasGarden = hasGarden;
            return this;
        }

        public Builder hasChildren(Boolean hasChildren) {
            this.hasChildren = hasChildren;
            return this;
        }

        public Builder otherPets(String otherPets) {
            this.otherPets = otherPets;
            return this;
        }

        public Builder experienceLevel(String experienceLevel) {
            this.experienceLevel = experienceLevel;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public AdoptionRequest build() {
            return new AdoptionRequest(id, pet, adopter, status, dateRequested, approvedDate,
                    notes, rejectionReason, housingType, hasGarden, hasChildren, otherPets,
                    experienceLevel, createdAt, updatedAt);
        }
    }
}