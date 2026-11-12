package com.elif.entities.events;

import com.elif.entities.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "pet_competition_entry",
        indexes = {
                @Index(name = "idx_pet_entry_participant", columnList = "participant_id"),
                @Index(name = "idx_pet_entry_event", columnList = "event_id"),
                @Index(name = "idx_pet_entry_user", columnList = "user_id")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PetCompetitionEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ─────────────────────────────────────────────────────────────
    // 🔗 RELATIONS
    // ─────────────────────────────────────────────────────────────

    /**
     * ⚠️ CHANGÉ : ManyToOne au lieu de OneToOne
     * → Permet plusieurs animaux par participant (plus flexible)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private EventParticipant participant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // ─────────────────────────────────────────────────────────────
    // 🐾 DONNÉES DE L'ANIMAL
    // ─────────────────────────────────────────────────────────────

    @Column(nullable = false, length = 100)
    private String petName;

    /**
     * 💡 Normaliser en MAJUSCULE côté backend (ex: "DOG", "CAT")
     */
    @Column(nullable = false, length = 50)
    private String species;

    @Column(nullable = false, length = 100)
    private String breed;

    @Column(name = "age_months")
    private Integer ageMonths;

    @Column(name = "weight_kg")
    private Double weightKg;

    /**
     * MALE / FEMALE
     */
    @Column(length = 10)
    private String sex;

    @Column(length = 80)
    private String color;

    @Builder.Default
    @Column(name = "is_vaccinated")
    private Boolean isVaccinated = false;

    @Builder.Default
    @Column(name = "has_license")
    private Boolean hasLicense = false;

    @Builder.Default
    @Column(name = "has_medical_cert")
    private Boolean hasMedicalCert = false;

    @Column(name = "experience_level")
    private Integer experienceLevel;

    @Column(name = "additional_info", columnDefinition = "TEXT")
    private String additionalInfo;

    // ─────────────────────────────────────────────────────────────
    // 📊 ÉLIGIBILITÉ (TRÈS IMPORTANT)
    // ─────────────────────────────────────────────────────────────

    /**
     * Score de 0 à 100
     */
    @Column(name = "eligibility_score")
    private Integer eligibilityScore;

    /**
     * ⚠️ IMPORTANT :
     * Toujours stocker même si INELIGIBLE
     * → Permet à l'admin de voir les refus
     */
    @Column(name = "eligibility_verdict", length = 20)
    private String eligibilityVerdict;
    // "ELIGIBLE", "WARNING", "INELIGIBLE"

    /**
     * Liste des règles satisfaites (JSON ou texte)
     */
    @Column(name = "satisfied_rules", columnDefinition = "TEXT")
    private String satisfiedRules;

    /**
     * Avertissements ou violations
     */
    @Column(name = "warnings", columnDefinition = "TEXT")
    private String warnings;
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}