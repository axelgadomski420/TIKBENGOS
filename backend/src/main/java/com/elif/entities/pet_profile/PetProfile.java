package com.elif.entities.pet_profile;

import com.elif.entities.user.User;
import com.elif.entities.pet_profile.enums.PetGender;
import com.elif.entities.pet_profile.enums.PetSpecies;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

@Entity
@Table(name = "pet")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(precision = 8, scale = 2)
    private BigDecimal weight;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PetSpecies species;

    @Column(length = 100)
    private String breed;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PetGender gender;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "gps_latitude")
    private Double latitude;

    @Column(name = "gps_longitude")
    private Double longitude;

    @Column(name = "location_updated_at")
    private LocalDateTime locationUpdatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Calculate age in months dynamically from date of birth.
     * @return age in months, or null if DOB is not set
     */
    public Integer calculateAgeInMonths() {
        if (this.dateOfBirth == null) {
            return null;
        }
        Period period = Period.between(this.dateOfBirth, LocalDate.now());
        return period.getYears() * 12 + period.getMonths();
    }

    /**
     * Format age as a human-readable string (e.g., "3 months", "1 year 5 months").
     * @return formatted age string
     */
    public String formatAge() {
        Integer ageInMonths = calculateAgeInMonths();
        if (ageInMonths == null) {
            return "Unknown";
        }
        if (ageInMonths == 0) {
            return "Newborn";
        }
        if (ageInMonths < 12) {
            return ageInMonths + " month" + (ageInMonths > 1 ? "s" : "");
        }
        int years = ageInMonths / 12;
        int months = ageInMonths % 12;
        StringBuilder sb = new StringBuilder();
        sb.append(years).append(" year").append(years > 1 ? "s" : "");
        if (months > 0) {
            sb.append(" ").append(months).append(" month").append(months > 1 ? "s" : "");
        }
        return sb.toString();
    }
}

