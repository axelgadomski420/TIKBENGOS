package com.elif.entities.pet_profile;

import com.elif.entities.pet_profile.enums.PetSpecies;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Food database for common pet foods with nutritional info.
 * Can be system-wide or user-custom.
 */
@Entity
@Table(name = "pet_food_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetFoodItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "brand", length = 100)
    private String brand;

    @Enumerated(EnumType.STRING)
    @Column(name = "species", length = 20)
    private PetSpecies species; // null = all species

    @Column(name = "food_type", length = 50)
    private String foodType; // "Dry", "Wet", "Raw", "Treat", "Supplement"

    /** Calories per 100g */
    @Column(name = "calories_per_100g", nullable = false)
    private Integer caloriesPer100g;

    /** Protein grams per 100g */
    @Column(name = "protein_per_100g", precision = 8, scale = 2)
    private BigDecimal proteinPer100g;

    /** Fat grams per 100g */
    @Column(name = "fat_per_100g", precision = 8, scale = 2)
    private BigDecimal fatPer100g;

    /** Carbs grams per 100g */
    @Column(name = "carbs_per_100g", precision = 8, scale = 2)
    private BigDecimal carbsPer100g;

    @Column(name = "fiber_per_100g", precision = 8, scale = 2)
    private BigDecimal fiberPer100g;

    @Column(name = "ingredients", length = 1000)
    private String ingredients;

    @Column(name = "is_system_food")
    private Boolean isSystemFood; // true = built-in, false = user-added

    @Column(name = "user_id")
    private Long userId; // null if system food

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
