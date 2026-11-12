package com.elif.entities.pet_transit;

import com.elif.entities.pet_transit.enums.CurrencyCode;
import com.elif.entities.pet_transit.enums.SafetyStatus;
import com.elif.entities.pet_transit.enums.TransportType;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import com.elif.entities.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "travel_plan")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TravelPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @NotNull
    @Positive
    @Column(name = "pet_id", nullable = false)
    private Long petId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false)
    private TravelDestination destination;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String origin;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "transport_type", nullable = false, length = 20)
    private TransportType transportType;

    @NotNull
    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Column(name = "return_date")
    private LocalDate returnDate;

    @DecimalMin(value = "0.0", inclusive = true, message = "Estimated travel hours must be greater than or equal to 0")
    @Column(name = "estimated_travel_hours", precision = 8, scale = 2)
    private BigDecimal estimatedTravelHours;

    @DecimalMin(value = "0.0", inclusive = true, message = "Estimated travel cost must be greater than or equal to 0")
    @Column(name = "estimated_travel_cost", precision = 12, scale = 2)
    private BigDecimal estimatedTravelCost;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private CurrencyCode currency;

    @DecimalMin(value = "0.0", inclusive = false)
    @Column(name = "animal_weight", precision = 8, scale = 2)
    private BigDecimal animalWeight;

    @DecimalMin(value = "0.0", inclusive = false)
    @Column(name = "cage_length", precision = 8, scale = 2)
    private BigDecimal cageLength;

    @DecimalMin(value = "0.0", inclusive = false)
    @Column(name = "cage_width", precision = 8, scale = 2)
    private BigDecimal cageWidth;

    @DecimalMin(value = "0.0", inclusive = false)
    @Column(name = "cage_height", precision = 8, scale = 2)
    private BigDecimal cageHeight;

    @Positive
    @Column(name = "hydration_interval_minutes")
    private Integer hydrationIntervalMinutes;

    @Min(0)
    @Column(name = "required_stops")
    private Integer requiredStops;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "safety_status", nullable = false, length = 20)
    private SafetyStatus safetyStatus = SafetyStatus.PENDING;

    @Min(0)
    @Max(100)
    @Builder.Default
    @Column(name = "readiness_score", precision = 5, scale = 2)
    private BigDecimal readinessScore = BigDecimal.ZERO;

    @Column(name = "admin_decision_comment", columnDefinition = "TEXT")
    private String adminDecisionComment;

    @NotNull
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TravelPlanStatus status = TravelPlanStatus.DRAFT;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_admin_id")
    private User reviewedByAdmin;

    @Builder.Default
    @Column(name = "admin_visible")
    private Boolean adminVisible = true;

    @Column(name = "admin_hidden_at")
    private LocalDateTime adminHiddenAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_hidden_by_id")
    private User adminHiddenBy;

    @OneToMany(mappedBy = "travelPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TravelDocument> travelDocuments = new ArrayList<>();

    @OneToMany(mappedBy = "travelPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SafetyChecklist> safetyChecklists = new ArrayList<>();

    @OneToMany(mappedBy = "travelPlan", cascade = CascadeType.ALL)
    @Builder.Default
    private List<TravelFeedback> travelFeedbacks = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @AssertTrue(message = "Return date must be on or after travel date")
    public boolean isReturnDateValid() {
        return returnDate == null || travelDate == null || !returnDate.isBefore(travelDate);
    }

    @AssertTrue(message = "Currency is required when estimated travel cost is greater than 0")
    public boolean isCurrencyProvidedWhenCostSet() {
        return estimatedTravelCost == null
                || estimatedTravelCost.compareTo(BigDecimal.ZERO) <= 0
                || currency != null;
    }

    @PrePersist
    public void onCreate() {
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.safetyStatus == null) {
            this.safetyStatus = SafetyStatus.PENDING;
        }
        if (this.status == null) {
            this.status = TravelPlanStatus.DRAFT;
        }
        if (this.readinessScore == null) {
            this.readinessScore = BigDecimal.ZERO;
        }
        if (this.adminVisible == null) {
            this.adminVisible = true;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
