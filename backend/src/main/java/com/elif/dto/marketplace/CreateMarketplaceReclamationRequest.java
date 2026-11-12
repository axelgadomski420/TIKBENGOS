package com.elif.dto.marketplace;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMarketplaceReclamationRequest {
    private Long userId;
    private Long orderId;
    private Long productId;
    private String title;
    private String description;
    private String type;
}
