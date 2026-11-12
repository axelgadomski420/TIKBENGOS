package com.elif.entities.events;

import com.elif.entities.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "event")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"participants", "reviews"})
@EqualsAndHashCode(exclude = {"participants", "reviews"})
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 200)
    private String location;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    @Column(nullable = false)
    private Integer maxParticipants;

    @Column(nullable = false)
    private Integer remainingSlots;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private EventStatus status = EventStatus.PLANNED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private EventCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder.Default
    @Column(name = "analytics_views", nullable = false)
    private Long analyticsViews = 0L;

    @Builder.Default
    @Column(name = "analytics_clicks", nullable = false)
    private Long analyticsClicks = 0L;

    @Builder.Default
    @Column(name = "analytics_engagement", nullable = false)
    private Long analyticsEngagement = 0L;

    @Builder.Default
    @Column(name = "analytics_registrations", nullable = false)
    private Long analyticsRegistrations = 0L;

    @Builder.Default
    @Column(name = "analytics_popularity_score", nullable = false)
    private Long analyticsPopularityScore = 0L;

    @Column(name = "analytics_last_updated_at")
    private LocalDateTime analyticsLastUpdatedAt;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private List<EventParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private List<EventReview> reviews = new ArrayList<>();

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private List<EventEligibilityRule> eligibilityRules = new ArrayList<>();

    @Builder.Default
    @Column(name = "is_online", nullable = false)
    private Boolean isOnline = false;

    @OneToOne(mappedBy = "event", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private EventVirtualSession virtualSession;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        if (remainingSlots == null) {
            remainingSlots = maxParticipants;
        }
        if (analyticsViews == null) {
            analyticsViews = 0L;
        }
        if (analyticsClicks == null) {
            analyticsClicks = 0L;
        }
        if (analyticsEngagement == null) {
            analyticsEngagement = 0L;
        }
        if (analyticsRegistrations == null) {
            analyticsRegistrations = 0L;
        }
        if (analyticsPopularityScore == null) {
            analyticsPopularityScore = 0L;
        }
    }

    public boolean isFull() {
        return remainingSlots != null && remainingSlots <= 0;
    }

    public boolean isJoinable() {
        return status == EventStatus.PLANNED && !isFull();
    }

    public void decrementSlots(int count) {
        if (remainingSlots < count) {
            throw new IllegalStateException("Pas assez de places disponibles.");
        }
        remainingSlots -= count;
        if (remainingSlots == 0) {
            status = EventStatus.FULL;
        }
    }

    public void releaseSlots(int count) {
        remainingSlots += count;
        if (status == EventStatus.FULL && remainingSlots > 0) {
            status = EventStatus.PLANNED;
        }
    }

    public double getAverageRating() {
        if (reviews == null || reviews.isEmpty()) {
            return 0.0;
        }
        return reviews.stream()
                .mapToInt(EventReview::getRating)
                .average()
                .orElse(0.0);
    }
}
