package com.elif.entities.pet_profile;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pet_water_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetWaterLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private PetProfile pet;

    @Column(name = "logged_date", nullable = false)
    private LocalDate loggedDate;

    /** Amount of water consumed in millilitres. */
    @Column(name = "amount_ml", nullable = false)
    private Integer amountMl;

    @Column(name = "note", length = 300)
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
