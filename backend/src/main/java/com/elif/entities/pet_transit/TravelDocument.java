package com.elif.entities.pet_transit;

import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.pet_transit.enums.DocumentValidationStatus;
import com.elif.entities.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@Table(name = "travel_document")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TravelDocument {

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
    @Column(name = "document_type", nullable = false, length = 40)
    private DocumentType documentType;

    @NotBlank
    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Column(name = "document_number", length = 120)
    private String documentNumber;

    @Column(name = "holder_name", length = 150)
    private String holderName;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "issuing_organization", length = 150)
    private String issuingOrganization;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Builder.Default
    @Column(name = "is_ocr_processed", nullable = false)
    private Boolean isOcrProcessed = false;

    @NotNull
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 20)
    private DocumentValidationStatus validationStatus = DocumentValidationStatus.PENDING;

    @Column(name = "validation_comment", columnDefinition = "TEXT")
    private String validationComment;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false, nullable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validated_by_admin_id")
    private User validatedByAdmin;

    @PrePersist
    public void onCreate() {
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.isOcrProcessed == null) {
            this.isOcrProcessed = false;
        }
        if (this.validationStatus == null) {
            this.validationStatus = DocumentValidationStatus.PENDING;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @AssertTrue(message = "issueDate ne doit pas etre apres expiryDate")
    public boolean isIssueDateValid() {
        return issueDate == null || expiryDate == null || !issueDate.isAfter(expiryDate);
    }
}