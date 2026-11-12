package com.elif.entities.pet_profile;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pet_health_record")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetHealthRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private PetProfile pet;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(name = "visit_type", nullable = false, length = 80)
    private String visitType;

    @Column(name = "veterinarian", length = 120)
    private String veterinarian;

    @Column(name = "clinic_name", length = 120)
    private String clinicName;

    @Column(name = "blood_type", length = 20)
    private String bloodType;

    @Column(name = "spayed_neutered", length = 20)
    private String spayedNeutered;

    @Column(name = "allergies", length = 1000)
    private String allergies;

    @Column(name = "chronic_conditions", length = 1000)
    private String chronicConditions;

    @Column(name = "previous_operations", length = 1000)
    private String previousOperations;

    @Column(name = "vaccination_history", length = 1000)
    private String vaccinationHistory;

    @Column(name = "special_diet", length = 500)
    private String specialDiet;

    @Column(name = "parasite_prevention", length = 500)
    private String parasitePrevention;

    @Column(name = "emergency_instructions", length = 1000)
    private String emergencyInstructions;

    @Column(name = "diagnosis", length = 255)
    private String diagnosis;

    @Column(name = "treatment", length = 500)
    private String treatment;

    @Column(name = "medications", length = 500)
    private String medications;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "next_visit_date")
    private LocalDate nextVisitDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
