package com.elif.entities.pet_profile;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Represents a scheduled meal in the pet's daily routine.
 * E.g., "Breakfast at 8:00 AM - 200 kcal"
 */
@Entity
@Table(name = "pet_meal_plan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetMealPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private PetProfile pet;

    @Column(name = "meal_name", nullable = false, length = 60)
    private String mealName; // e.g., "Breakfast", "Lunch", "Dinner", "Snack"

    @Column(name = "scheduled_time", nullable = false)
    private LocalTime scheduledTime;

    @Column(name = "target_calories", nullable = false)
    private Integer targetCalories;

    @Column(name = "target_portion_grams", precision = 8, scale = 2)
    private BigDecimal targetPortionGrams;

    @Column(name = "food_type", length = 100)
    private String foodType; // e.g., "Dry kibble", "Wet food", "Raw"

    @Column(name = "reminder_enabled")
    private Boolean reminderEnabled;

    @Column(name = "reminder_minutes_before")
    private Integer reminderMinutesBefore;

    @Column(name = "active")
    private Boolean active;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
