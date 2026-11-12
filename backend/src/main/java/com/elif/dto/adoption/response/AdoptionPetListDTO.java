package com.elif.dto.adoption.response;

import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetSize;

public class AdoptionPetListDTO {

    private Long id;
    private String name;
    private AdoptionPetType type;
    private String breed;
    private Integer age;
    private AdoptionPetSize size;
    private String photo;
    private Long shelterId;
    private String shelterName;

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

    public AdoptionPetSize getSize() {
        return size;
    }

    public void setSize(AdoptionPetSize size) {
        this.size = size;
    }

    public String getPhoto() {
        return photo;
    }

    public void setPhoto(String photo) {
        this.photo = photo;
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

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final AdoptionPetListDTO dto = new AdoptionPetListDTO();

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

        public Builder size(AdoptionPetSize size) {
            dto.setSize(size);
            return this;
        }

        public Builder photo(String photo) {
            dto.setPhoto(photo);
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

        public AdoptionPetListDTO build() {
            return dto;
        }
    }
}