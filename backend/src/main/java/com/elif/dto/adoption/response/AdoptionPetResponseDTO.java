package com.elif.dto.adoption.response;

import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetGender;
import com.elif.entities.adoption.enums.AdoptionPetSize;

import java.time.LocalDateTime;

public class AdoptionPetResponseDTO {

    private Long id;
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
    private Boolean available;
    private Long shelterId;
    private String shelterName;
    private LocalDateTime createdAt;
    private LocalDateTime adoptedAt;

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public Boolean getAvailable() {
        return available;
    }

    public void setAvailable(Boolean available) {
        this.available = available;
    }

    public Long getShelterId() {
        return shelterId;
    }

    public void setShelterId(Long shelterId) {
        this.shelterId = shelterId;
    }

    public String getShelterName() {
        return shelterName;
    }

    public void setShelterName(String shelterName) {
        this.shelterName = shelterName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getAdoptedAt() {
        return adoptedAt;
    }

    public void setAdoptedAt(LocalDateTime adoptedAt) {
        this.adoptedAt = adoptedAt;
    }

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final AdoptionPetResponseDTO dto = new AdoptionPetResponseDTO();

        public Builder id(Long id) {
            dto.setId(id);
            return this;
        }

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

        public Builder available(Boolean available) {
            dto.setAvailable(available);
            return this;
        }

        public Builder shelterId(Long shelterId) {
            dto.setShelterId(shelterId);
            return this;
        }

        public Builder shelterName(String shelterName) {
            dto.setShelterName(shelterName);
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            dto.setCreatedAt(createdAt);
            return this;
        }

        public Builder adoptedAt(LocalDateTime adoptedAt) {
            dto.setAdoptedAt(adoptedAt);
            return this;
        }

        public AdoptionPetResponseDTO build() {
            return dto;
        }
    }
}