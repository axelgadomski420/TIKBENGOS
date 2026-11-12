package com.elif.dto.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendedServiceDTO {
    private Long id;
    private String name;
    private String categoryName;
    private int score;
    private double rating;

    // Enriched fields
    private String imageUrl;
    private double price;
    private int duration;
    private String providerName;
    private long bookingCount;
    private boolean trending;   // bookingCount >= 5
    private boolean topRated;   // rating >= 4.5
    private String reasonLabel; // "Based on your history", "Popular", "Top Rated", etc.
}
