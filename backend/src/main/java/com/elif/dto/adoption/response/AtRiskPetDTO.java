package com.elif.dto.adoption.response;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO représentant un animal "à risque" avec son score IA,
 * son niveau de risque et les recommandations personnalisées.
 */
public class AtRiskPetDTO {

    private Long   petId;
    private String petName;
    private String petType;
    private String petBreed;
    private Integer petAge;
    private String petGender;
    private String petSize;
    private String petPhotos;
    private String specialNeeds;
    private Boolean spayedNeutered;

    // Shelter info
    private Long   shelterId;
    private String shelterName;
    private String shelterEmail;

    // Métriques temporelles
    private LocalDateTime createdAt;
    private int    daysInShelter;       // Jours depuis l'ajout
    private int    requestCount;        // Nombre total de demandes reçues
    private LocalDateTime lastRequestDate; // Date de la dernière demande

    // Score IA (0 = pas de risque, 100 = critique)
    private int    riskScore;
    private String riskLevel;   // SAFE / WATCH / AT_RISK / CRITICAL
    private String riskColor;   // couleur hex pour le frontend

    // Facteurs qui ont contribué au score
    private List<String> riskFactors;

    // Recommandations IA personnalisées
    private List<String> recommendations;

    // ── Constructeur ──
    public AtRiskPetDTO() {}

    // ── Getters & Setters ──
    public Long getPetId()                       { return petId; }
    public void setPetId(Long petId)             { this.petId = petId; }

    public String getPetName()                   { return petName; }
    public void setPetName(String petName)       { this.petName = petName; }

    public String getPetType()                   { return petType; }
    public void setPetType(String petType)       { this.petType = petType; }

    public String getPetBreed()                  { return petBreed; }
    public void setPetBreed(String petBreed)     { this.petBreed = petBreed; }

    public Integer getPetAge()                   { return petAge; }
    public void setPetAge(Integer petAge)        { this.petAge = petAge; }

    public String getPetGender()                 { return petGender; }
    public void setPetGender(String petGender)   { this.petGender = petGender; }

    public String getPetSize()                   { return petSize; }
    public void setPetSize(String petSize)       { this.petSize = petSize; }

    public String getPetPhotos()                 { return petPhotos; }
    public void setPetPhotos(String petPhotos)   { this.petPhotos = petPhotos; }

    public String getSpecialNeeds()              { return specialNeeds; }
    public void setSpecialNeeds(String v)        { this.specialNeeds = v; }

    public Boolean getSpayedNeutered()           { return spayedNeutered; }
    public void setSpayedNeutered(Boolean v)     { this.spayedNeutered = v; }

    public Long getShelterId()                   { return shelterId; }
    public void setShelterId(Long shelterId)     { this.shelterId = shelterId; }

    public String getShelterName()               { return shelterName; }
    public void setShelterName(String v)         { this.shelterName = v; }

    public String getShelterEmail()              { return shelterEmail; }
    public void setShelterEmail(String v)        { this.shelterEmail = v; }

    public LocalDateTime getCreatedAt()          { return createdAt; }
    public void setCreatedAt(LocalDateTime v)    { this.createdAt = v; }

    public int getDaysInShelter()                { return daysInShelter; }
    public void setDaysInShelter(int v)          { this.daysInShelter = v; }

    public int getRequestCount()                 { return requestCount; }
    public void setRequestCount(int v)           { this.requestCount = v; }

    public LocalDateTime getLastRequestDate()           { return lastRequestDate; }
    public void setLastRequestDate(LocalDateTime v)     { this.lastRequestDate = v; }

    public int getRiskScore()                    { return riskScore; }
    public void setRiskScore(int riskScore)      { this.riskScore = riskScore; }

    public String getRiskLevel()                 { return riskLevel; }
    public void setRiskLevel(String riskLevel)   { this.riskLevel = riskLevel; }

    public String getRiskColor()                 { return riskColor; }
    public void setRiskColor(String riskColor)   { this.riskColor = riskColor; }

    public List<String> getRiskFactors()         { return riskFactors; }
    public void setRiskFactors(List<String> v)   { this.riskFactors = v; }

    public List<String> getRecommendations()     { return recommendations; }
    public void setRecommendations(List<String> v) { this.recommendations = v; }
}