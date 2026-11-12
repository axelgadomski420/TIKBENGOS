package com.elif.entities.pet_transit;

import com.elif.entities.pet_transit.enums.FeedbackType;
import com.elif.entities.pet_transit.enums.ProcessingStatus;
import com.elif.entities.pet_transit.enums.UrgencyLevel;
import com.elif.entities.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "travel_feedback")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TravelFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_plan_id", nullable = false)
    private TravelPlan travelPlan;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "feedback_type", nullable = false, length = 20)
    private FeedbackType feedbackType;

    @Min(1)
    @Max(5)
    @Column(name = "rating")
    private Integer rating;

    @Column(name = "title", length = 150)
    private String title;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "incident_location", length = 200)
    private String incidentLocation;

    @Builder.Default
    @Column(name = "ai_sentiment_score", precision = 5, scale = 2)
    private BigDecimal aiSentimentScore = BigDecimal.ZERO;

    @NotNull
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "urgency_level", nullable = false, length = 10)
    private UrgencyLevel urgencyLevel = UrgencyLevel.NORMAL;

    @NotNull
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 20)
    private ProcessingStatus processingStatus = ProcessingStatus.PENDING;

    @Column(name = "admin_response", columnDefinition = "TEXT")
    private String adminResponse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responded_by_admin_id")
    private User respondedByAdmin;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.aiSentimentScore == null) {
            this.aiSentimentScore = BigDecimal.ZERO;
        }
        if (this.urgencyLevel == null) {
            this.urgencyLevel = UrgencyLevel.NORMAL;
        }
        if (this.processingStatus == null) {
            this.processingStatus = ProcessingStatus.PENDING;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @AssertTrue(message = "rating est obligatoire quand feedbackType = REVIEW")
    public boolean isRatingRequiredForReview() {
        return feedbackType != FeedbackType.REVIEW || rating != null;
    }

    @AssertTrue(message = "message est obligatoire pour INCIDENT, COMPLAINT et SUGGESTION")
    public boolean isMessageRequiredForIncidentOrComplaint() {
        if (feedbackType == null) {
            return true;
        }
        return (feedbackType != FeedbackType.INCIDENT
                && feedbackType != FeedbackType.COMPLAINT
                && feedbackType != FeedbackType.SUGGESTION)
                || (message != null && !message.trim().isEmpty());
    }
}
