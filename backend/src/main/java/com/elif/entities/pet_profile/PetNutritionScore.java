package com.elif.entities.pet_profile;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Daily nutrition score/grade for a pet.
 * Calculated based on calorie adherence, meal completion, macro balance, water intake.
 */
@Entity
@Table(name = "pet_nutrition_score")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetNutritionScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private PetProfile pet;

    @Column(name = "score_date", nullable = false)
    private LocalDate scoreDate;

    /** Overall score 0-100 */
    @Column(name = "overall_score", nullable = false)
    private Integer overallScore;

    /** Letter grade A+, A, B+, B, C, D, F */
    @Column(name = "grade", nullable = false, length = 3)
    private String grade;

    @Column(name = "calorie_score")
    private Integer calorieScore; // 0-100

    @Column(name = "meal_completion_score")
    private Integer mealCompletionScore; // 0-100

    @Column(name = "macro_balance_score")
    private Integer macroBalanceScore; // 0-100

    @Column(name = "hydration_score")
    private Integer hydrationScore; // 0-100

    @Column(name = "consistency_score")
    private Integer consistencyScore; // 0-100

    @Column(name = "feedback", length = 500)
    private String feedback;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
