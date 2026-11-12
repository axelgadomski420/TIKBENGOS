package com.elif.dto.adoption.response;

import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetSize;
import com.elif.entities.adoption.enums.AdoptionPetGender;

import java.util.List;

/**
 * DTO de réponse du wizard de suggestion.
 * Contient les infos de l'animal + son score de compatibilité
 * + les raisons qui expliquent ce score.
 */
public class PetSuggestionDTO {

    // ── Infos de l'animal ──
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
    private Long shelterId;
    private String shelterName;

    // ── Score de compatibilité ──
    private int compatibilityScore;      // 0 à 100
    private String compatibilityLabel;   // "Excellent", "Good", "Fair"
    private List<String> matchReasons;   // ex: ["Matches your size preference", "Good with children"]
    private List<String> warningReasons; // ex: ["May need experienced owner"]

    // ============================================================
    // CONSTRUCTEUR
    // ============================================================

    public PetSuggestionDTO() {}

    // ============================================================
    // GETTERS & SETTERS
    // ============================================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public AdoptionPetType getType() { return type; }
    public void setType(AdoptionPetType type) { this.type = type; }

    public String getBreed() { return breed; }
    public void setBreed(String breed) { this.breed = breed; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public AdoptionPetGender getGender() { return gender; }
    public void setGender(AdoptionPetGender gender) { this.gender = gender; }

    public AdoptionPetSize getSize() { return size; }
    public void setSize(AdoptionPetSize size) { this.size = size; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getHealthStatus() { return healthStatus; }
    public void setHealthStatus(String healthStatus) { this.healthStatus = healthStatus; }

    public Boolean getSpayedNeutered() { return spayedNeutered; }
    public void setSpayedNeutered(Boolean spayedNeutered) { this.spayedNeutered = spayedNeutered; }

    public String getSpecialNeeds() { return specialNeeds; }
    public void setSpecialNeeds(String specialNeeds) { this.specialNeeds = specialNeeds; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPhotos() { return photos; }
    public void setPhotos(String photos) { this.photos = photos; }

    public Long getShelterId() { return shelterId; }
    public void setShelterId(Long shelterId) { this.shelterId = shelterId; }

    public String getShelterName() { return shelterName; }
    public void setShelterName(String shelterName) { this.shelterName = shelterName; }

    public int getCompatibilityScore() { return compatibilityScore; }
    public void setCompatibilityScore(int compatibilityScore) { this.compatibilityScore = compatibilityScore; }

    public String getCompatibilityLabel() { return compatibilityLabel; }
    public void setCompatibilityLabel(String compatibilityLabel) { this.compatibilityLabel = compatibilityLabel; }

    public List<String> getMatchReasons() { return matchReasons; }
    public void setMatchReasons(List<String> matchReasons) { this.matchReasons = matchReasons; }

    public List<String> getWarningReasons() { return warningReasons; }
    public void setWarningReasons(List<String> warningReasons) { this.warningReasons = warningReasons; }
}