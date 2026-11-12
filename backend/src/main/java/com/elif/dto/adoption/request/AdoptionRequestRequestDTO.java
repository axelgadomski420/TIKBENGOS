package com.elif.dto.adoption.request;

public class AdoptionRequestRequestDTO {

    private Long petId;
    private String notes;
    private String housingType;
    private Boolean hasGarden;
    private Boolean hasChildren;
    private String otherPets;
    private String experienceLevel;


    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

    public Long getPetId() {
        return petId;
    }

    public void setPetId(Long petId) {
        this.petId = petId;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final AdoptionRequestRequestDTO dto = new AdoptionRequestRequestDTO();

        public Builder petId(Long petId) {
            dto.setPetId(petId);
            return this;
        }

        public Builder notes(String notes) {
            dto.setNotes(notes);
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

        public AdoptionRequestRequestDTO build() {
            return dto;
        }
    }
}