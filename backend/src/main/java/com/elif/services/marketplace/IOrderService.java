package com.elif.services.marketplace;

import com.elif.dto.marketplace.CreateOrderRequest;
import com.elif.dto.marketplace.OrderResponse;

import java.util.List;

public interface IOrderService {
    OrderResponse createOrder(CreateOrderRequest request);

    OrderResponse getOrderById(Long id);

    List<OrderResponse> getOrdersByUserId(Long userId);

    OrderResponse confirmOrder(Long id);

    OrderResponse cancelOrder(Long id);

    OrderResponse updateOrderStatus(Long id, String status);

    List<OrderResponse> getAllOrders();
}
