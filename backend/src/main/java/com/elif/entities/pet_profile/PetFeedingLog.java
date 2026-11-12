package com.elif.entities.pet_profile;

import com.elif.entities.pet_profile.enums.PetFeedingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pet_feeding_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetFeedingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private PetProfile pet;

    @Column(name = "fed_at", nullable = false)
    private LocalDateTime fedAt;

    @Column(name = "meal_label", length = 60)
    private String mealLabel;

    @Column(name = "food_name", nullable = false, length = 120)
    private String foodName;

    @Column(name = "portion_grams", nullable = false, precision = 8, scale = 2)
    private BigDecimal portionGrams;

    @Column(name = "calories_actual")
    private Integer caloriesActual;

    @Column(name = "protein_grams", precision = 8, scale = 2)
    private BigDecimal proteinGrams;

    @Column(name = "fat_grams", precision = 8, scale = 2)
    private BigDecimal fatGrams;

    @Column(name = "carbs_grams", precision = 8, scale = 2)
    private BigDecimal carbsGrams;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PetFeedingStatus status;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
