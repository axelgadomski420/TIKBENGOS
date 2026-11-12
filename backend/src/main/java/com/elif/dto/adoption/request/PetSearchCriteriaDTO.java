package com.elif.dto.adoption.request;

import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetSize;
import com.elif.entities.adoption.enums.AdoptionPetGender;

/**
 * DTO contenant les critères de recherche du wizard côté client.
 * Le service de suggestion calcule un score de compatibilité
 * pour chaque animal disponible selon ces critères.
 */
public class PetSearchCriteriaDTO {

    // ── Critères sur l'animal ──
    private AdoptionPetType type;        // CHIEN, CHAT, LAPIN...
    private AdoptionPetSize size;        // PETIT, MOYEN, GRAND, TRES_GRAND
    private AdoptionPetGender gender;    // MALE, FEMELLE
    private String breed;               // race (optionnel)
    private String color;               // couleur (optionnel)
    private Integer maxAge;             // âge max en mois
    private Boolean spayedNeutered;     // stérilisé ?
    private Boolean hasSpecialNeeds;    // besoins spéciaux ok ?

    // ── Situation de l'adoptant ──
    private String housingType;         // APARTMENT, HOUSE, FARM
    private Boolean hasGarden;          // jardin disponible ?
    private Boolean hasChildren;        // enfants à la maison ?
    private Boolean hasOtherPets;       // autres animaux ?
    private String experienceLevel;     // BEGINNER, INTERMEDIATE, EXPERT

    // ============================================================
    // GETTERS & SETTERS
    // ============================================================

    public AdoptionPetType getType() { return type; }
    public void setType(AdoptionPetType type) { this.type = type; }

    public AdoptionPetSize getSize() { return size; }
    public void setSize(AdoptionPetSize size) { this.size = size; }

    public AdoptionPetGender getGender() { return gender; }
    public void setGender(AdoptionPetGender gender) { this.gender = gender; }

    public String getBreed() { return breed; }
    public void setBreed(String breed) { this.breed = breed; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getMaxAge() { return maxAge; }
    public void setMaxAge(Integer maxAge) { this.maxAge = maxAge; }

    public Boolean getSpayedNeutered() { return spayedNeutered; }
    public void setSpayedNeutered(Boolean spayedNeutered) { this.spayedNeutered = spayedNeutered; }

    public Boolean getHasSpecialNeeds() { return hasSpecialNeeds; }
    public void setHasSpecialNeeds(Boolean hasSpecialNeeds) { this.hasSpecialNeeds = hasSpecialNeeds; }

    public String getHousingType() { return housingType; }
    public void setHousingType(String housingType) { this.housingType = housingType; }

    public Boolean getHasGarden() { return hasGarden; }
    public void setHasGarden(Boolean hasGarden) { this.hasGarden = hasGarden; }

    public Boolean getHasChildren() { return hasChildren; }
    public void setHasChildren(Boolean hasChildren) { this.hasChildren = hasChildren; }

    public Boolean getHasOtherPets() { return hasOtherPets; }
    public void setHasOtherPets(Boolean hasOtherPets) { this.hasOtherPets = hasOtherPets; }

    public String getExperienceLevel() { return experienceLevel; }
    public void setExperienceLevel(String experienceLevel) { this.experienceLevel = experienceLevel; }
}