package com.elif.dto.marketplace;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StripeCheckoutRequest {
    private Long userId;
    private List<OrderItemRequest> items;
    private String successUrl;
    private String cancelUrl;
    private String promoCode;
}
