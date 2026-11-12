package com.elif.entities.adoption;

import com.elif.entities.adoption.enums.AdoptionPetType;
import com.elif.entities.adoption.enums.AdoptionPetGender;
import com.elif.entities.adoption.enums.AdoptionPetSize;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "adoption_pet")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AdoptionPet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdoptionPetType type;

    @Column(length = 100)
    private String breed;

    private Integer age;

    @Enumerated(EnumType.STRING)
    private AdoptionPetGender gender;

    @Enumerated(EnumType.STRING)
    private AdoptionPetSize size;

    @Column(length = 50)
    private String color;

    @Column(name = "health_status")
    private String healthStatus;

    @Column(name = "spayed_neutered")
    private Boolean spayedNeutered = false;

    @Column(name = "special_needs", columnDefinition = "TEXT")
    private String specialNeeds;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "JSON")
    private String photos;

    @Column(nullable = false)
    private Boolean available = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shelter_id", nullable = false)
    // ✅ FIX : @JsonIgnoreProperties au lieu de @JsonIgnore
    // @JsonIgnore bloquait AUSSI la désérialisation entrante (Angular → Spring)
    // @JsonIgnoreProperties ignore uniquement les champs qui causent des boucles infinies
    // tout en permettant à Jackson de lire l'objet shelter envoyé par le frontend
    @JsonIgnoreProperties({"pets", "adoptionRequests", "hibernateLazyInitializer", "handler", "user"})
    private Shelter shelter;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "adopted_at")
    private LocalDateTime adoptedAt;

    @OneToMany(mappedBy = "pet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<AdoptionRequest> adoptionRequests = new ArrayList<>();

    @OneToOne(mappedBy = "animal")
    @JsonIgnore
    private Contract contract;

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

    public Shelter getShelter() {
        return shelter;
    }

    public void setShelter(Shelter shelter) {
        this.shelter = shelter;
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

    public List<AdoptionRequest> getAdoptionRequests() {
        return adoptionRequests;
    }

    public void setAdoptionRequests(List<AdoptionRequest> adoptionRequests) {
        this.adoptionRequests = adoptionRequests;
    }

    public Contract getContract() {
        return contract;
    }

    public void setContract(Contract contract) {
        this.contract = contract;
    }
}