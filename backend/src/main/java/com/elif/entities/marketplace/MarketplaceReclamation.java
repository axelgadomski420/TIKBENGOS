package com.elif.entities.marketplace;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "marketplace_reclamation")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceReclamation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "product_id")
    private Long productId;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Lob
    @Column(name = "image", columnDefinition = "LONGBLOB")
    private byte[] image;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ReclamationType type = ReclamationType.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ReclamationStatus status = ReclamationStatus.OPEN;

    @Column(name = "response_malek", columnDefinition = "TEXT")
    private String responseMalek;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ReclamationType {
        DELIVERY,
        DAMAGED_PRODUCT,
        WRONG_ITEM,
        PAYMENT,
        REFUND,
        OTHER
    }

    public enum ReclamationStatus {
        OPEN,
        IN_REVIEW,
        RESOLVED,
        REJECTED
    }
}
