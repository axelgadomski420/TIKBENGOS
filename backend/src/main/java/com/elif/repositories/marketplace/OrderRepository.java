package com.elif.repositories.marketplace;

import com.elif.entities.marketplace.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Order> findByStripeSessionId(String stripeSessionId);

    boolean existsByStatusAndOrderItems_ProductId(Order.OrderStatus status, Long productId);

        @Query("""
                        SELECT COALESCE(SUM(order.totalAmount), 0)
                        FROM Order order
                        WHERE order.userId = :userId
                            AND order.status <> :excludedStatus
                        """)
        BigDecimal sumPurchasedAmountByUserIdAndStatusNot(
                        @Param("userId") Long userId,
                        @Param("excludedStatus") Order.OrderStatus excludedStatus
        );
}
