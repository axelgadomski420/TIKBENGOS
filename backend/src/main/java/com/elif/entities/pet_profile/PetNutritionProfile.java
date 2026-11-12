package com.elif.entities.pet_profile;

import com.elif.entities.pet_profile.enums.PetActivityLevel;
import com.elif.entities.pet_profile.enums.PetNutritionGoal;
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
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pet_nutrition_profile")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetNutritionProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private PetProfile pet;

    @Enumerated(EnumType.STRING)
    @Column(name = "goal", nullable = false, length = 30)
    private PetNutritionGoal goal;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_level", nullable = false, length = 20)
    private PetActivityLevel activityLevel;

    @Column(name = "target_weight_kg", precision = 8, scale = 2)
    private BigDecimal targetWeightKg;

    @Column(name = "daily_calorie_target", nullable = false)
    private Integer dailyCalorieTarget;

    @Column(name = "meals_per_day", nullable = false)
    private Integer mealsPerDay;

    @Column(name = "food_preference", length = 50)
    private String foodPreference;

    @Column(name = "allergies", length = 1000)
    private String allergies;

    @Column(name = "forbidden_ingredients", length = 1000)
    private String forbiddenIngredients;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
