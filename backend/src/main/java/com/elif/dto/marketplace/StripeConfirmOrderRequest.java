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
public class StripeConfirmOrderRequest {
    private Long userId;
    private String sessionId;
    private List<OrderItemRequest> items;
    private String promoCode;
}
