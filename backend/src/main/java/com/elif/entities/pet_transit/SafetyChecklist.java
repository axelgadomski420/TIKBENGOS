package com.elif.entities.pet_transit;

import com.elif.entities.pet_transit.enums.ChecklistCategory;
import com.elif.entities.pet_transit.enums.PriorityLevel;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "safety_checklist")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class SafetyChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_plan_id", nullable = false)
    private TravelPlan travelPlan;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String title;

    @Size(max = 80)
    @Column(name = "task_code", length = 80)
    private String taskCode;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChecklistCategory category;


    @Enumerated(EnumType.STRING)
    @Column(name = "priority_level", nullable = false, length = 10)
    private PriorityLevel priorityLevel;

    @Builder.Default
    @Column(name = "is_mandatory", nullable = false)
    private boolean mandatory = false;

    @Builder.Default
    @Column(name = "is_completed", nullable = false)
    private boolean completed = false;

    @Column(name = "due_date")
    private LocalDate dueDate;


    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    public void onCreate() {
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}