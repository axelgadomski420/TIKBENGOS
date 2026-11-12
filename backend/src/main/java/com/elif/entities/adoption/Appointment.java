package com.elif.entities.adoption;

import com.elif.entities.user.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "appointment")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // La demande d'adoption liée
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private AdoptionRequest request;

    // L'animal concerné
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "adoptionRequests", "contract", "shelter"})
    private AdoptionPet pet;

    // L'adoptant
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adopter_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "shelter"})
    private User adopter;

    // Le refuge
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shelter_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user", "adoptionPets"})
    private Shelter shelter;

    // Date et heure du rendez-vous
    @Column(name = "appointment_date", nullable = false)
    private LocalDateTime appointmentDate;

    // Statut : SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
    @Column(nullable = false, length = 30)
    private String status = "SCHEDULED";

    // Notes du shelter pour l'adoptant
    @Column(columnDefinition = "TEXT")
    private String shelterNotes;

    // Résultat après la consultation : APPROVED, REJECTED, PENDING
    @Column(name = "consultation_result", length = 30)
    private String consultationResult;

    // Message de réponse du shelter après consultation
    @Column(name = "response_message", columnDefinition = "TEXT")
    private String responseMessage;

    // Score de compatibilité calculé au moment du RDV
    @Column(name = "compatibility_score")
    private Integer compatibilityScore;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ============================================================
    // CONSTRUCTEURS
    // ============================================================

    public Appointment() {}

    // ============================================================
    // GETTERS & SETTERS
    // ============================================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public AdoptionRequest getRequest() { return request; }
    public void setRequest(AdoptionRequest request) { this.request = request; }

    public AdoptionPet getPet() { return pet; }
    public void setPet(AdoptionPet pet) { this.pet = pet; }

    public User getAdopter() { return adopter; }
    public void setAdopter(User adopter) { this.adopter = adopter; }

    public Shelter getShelter() { return shelter; }
    public void setShelter(Shelter shelter) { this.shelter = shelter; }

    public LocalDateTime getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(LocalDateTime appointmentDate) { this.appointmentDate = appointmentDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getShelterNotes() { return shelterNotes; }
    public void setShelterNotes(String shelterNotes) { this.shelterNotes = shelterNotes; }

    public String getConsultationResult() { return consultationResult; }
    public void setConsultationResult(String consultationResult) { this.consultationResult = consultationResult; }

    public String getResponseMessage() { return responseMessage; }
    public void setResponseMessage(String responseMessage) { this.responseMessage = responseMessage; }

    public Integer getCompatibilityScore() { return compatibilityScore; }
    public void setCompatibilityScore(Integer compatibilityScore) { this.compatibilityScore = compatibilityScore; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}