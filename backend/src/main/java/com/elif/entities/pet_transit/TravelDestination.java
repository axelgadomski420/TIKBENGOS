package com.elif.entities.pet_transit;

import com.elif.entities.pet_transit.enums.DestinationStatus;
import com.elif.entities.pet_transit.enums.DestinationType;
import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.pet_transit.enums.TransportType;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "travel_destination")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TravelDestination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String title;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String country;

    @Column(length = 100)
    private String region;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "destination_type", nullable = false, length = 30)
    private DestinationType destinationType;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "recommended_transport_type", nullable = false, length = 20)
    private TransportType recommendedTransportType;

    @Min(1)
    @Max(5)
    @Column(name = "pet_friendly_level")
    private Integer petFriendlyLevel;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "safety_tips", columnDefinition = "TEXT")
    private String safetyTips;

    @ElementCollection(targetClass = DocumentType.class)
    @CollectionTable(
            name = "travel_destination_required_documents",
            joinColumns = @JoinColumn(name = "travel_destination_id")
    )
    @Column(name = "document_type", nullable = false, length = 40)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<DocumentType> requiredDocuments = new HashSet<>();

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @OneToMany(mappedBy = "destination", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<TravelDestinationImage> carouselImages = new ArrayList<>();

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DestinationStatus status = DestinationStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status_before_archive", length = 20)
    private DestinationStatus previousStatusBeforeArchive;

    @Column(name = "scheduled_publish_at")
    private LocalDateTime scheduledPublishAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

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
        if (this.status == null) {
            this.status = DestinationStatus.DRAFT;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @AssertTrue(message = "scheduledPublishAt est obligatoire quand status = SCHEDULED")
    public boolean isScheduledPublishAtValid() {
        return status != DestinationStatus.SCHEDULED || scheduledPublishAt != null;
    }

    @AssertTrue(message = "publishedAt est obligatoire quand status = PUBLISHED")
    public boolean isPublishedAtValid() {
        return status != DestinationStatus.PUBLISHED || publishedAt != null;
    }
}