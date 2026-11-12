package com.elif.dto.adoption.request;

import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetGender;
import com.elif.entities.adoption.enums.AdoptionPetSize;

public class AdoptionPetRequestDTO {

    private String name;
    private AdoptionPetType type;
    private String breed;
    private Integer age;
    private AdoptionPetGender gender;
    private AdoptionPetSize size;
    private String color;
    private String healthStatus;
    private Boolean spayedNeutered;
    private String specialNeeds;
    private String description;
    private String photos;

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AdoptionPetType getType() {
        return type;
    }

    public void setType(AdoptionPetType type) {
        this.type = type;
    }

    public String getBreed() {
        return breed;
    }

    public void setBreed(String breed) {
        this.breed = breed;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public AdoptionPetGender getGender() {
        return gender;
    }

    public void setGender(AdoptionPetGender gender) {
        this.gender = gender;
    }

    public AdoptionPetSize getSize() {
        return size;
    }

    public void setSize(AdoptionPetSize size) {
        this.size = size;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getHealthStatus() {
        return healthStatus;
    }

    public void setHealthStatus(String healthStatus) {
        this.healthStatus = healthStatus;
    }

    public Boolean getSpayedNeutered() {
        return spayedNeutered;
    }

    public void setSpayedNeutered(Boolean spayedNeutered) {
        this.spayedNeutered = spayedNeutered;
    }

    public String getSpecialNeeds() {
        return specialNeeds;
    }

    public void setSpecialNeeds(String specialNeeds) {
        this.specialNeeds = specialNeeds;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPhotos() {
        return photos;
    }

    public void setPhotos(String photos) {
        this.photos = photos;
    }

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final AdoptionPetRequestDTO dto = new AdoptionPetRequestDTO();

        public Builder name(String name) {
            dto.setName(name);
            return this;
        }

        public Builder type(AdoptionPetType type) {
            dto.setType(type);
            return this;
        }

        public Builder breed(String breed) {
            dto.setBreed(breed);
            return this;
        }

        public Builder age(Integer age) {
            dto.setAge(age);
            return this;
        }

        public Builder gender(AdoptionPetGender gender) {
            dto.setGender(gender);
            return this;
        }

        public Builder size(AdoptionPetSize size) {
            dto.setSize(size);
            return this;
        }

        public Builder color(String color) {
            dto.setColor(color);
            return this;
        }

        public Builder healthStatus(String healthStatus) {
            dto.setHealthStatus(healthStatus);
            return this;
        }

        public Builder spayedNeutered(Boolean spayedNeutered) {
            dto.setSpayedNeutered(spayedNeutered);
            return this;
        }

        public Builder specialNeeds(String specialNeeds) {
            dto.setSpecialNeeds(specialNeeds);
            return this;
        }

        public Builder description(String description) {
            dto.setDescription(description);
            return this;
        }

        public Builder photos(String photos) {
            dto.setPhotos(photos);
            return this;
        }

        public AdoptionPetRequestDTO build() {
            return dto;
        }
    }
}