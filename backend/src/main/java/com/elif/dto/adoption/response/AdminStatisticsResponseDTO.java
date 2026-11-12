package com.elif.dto.adoption.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatisticsResponseDTO {

    // Users
    private Long totalUsers;

    // Shelters
    private Long totalShelters;
    private Long pendingShelters;
    private Long verifiedShelters;

    // Pets
    private Long totalPets;
    private Long availablePets;
    private Long adoptedPets;

    // ✅ Nombre d'animaux par catégorie/type (ex: {"DOG": 12, "CAT": 8, "RABBIT": 3})
    private Map<String, Long> petsByCategory;

    // Adoption Requests
    private Long totalAdoptionRequests;
    private Long pendingRequests;
    private Long approvedRequests;
    private Long rejectedRequests;
    private Long cancelledRequests;
    private Long underReviewRequests;

    // Contracts
    private Long totalContracts;
    private BigDecimal totalRevenue;

    // Reviews
    private Long pendingReviews;
    private Long approvedReviews;
    private Long totalReviews;
}