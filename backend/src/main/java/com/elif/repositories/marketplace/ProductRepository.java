package com.elif.repositories.marketplace;

import com.elif.entities.marketplace.Product;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByActiveTrue();

    List<Product> findByCategory(String category);

    List<Product> findByActiveTrueAndCategory(String category);

    List<Product> findByNameContainingIgnoreCase(String name);

    @Query("""
            SELECT oi.productId
            FROM OrderItem oi
            JOIN oi.order o
            WHERE o.status <> com.elif.entities.marketplace.Order$OrderStatus.CANCELLED
            GROUP BY oi.productId
            ORDER BY SUM(oi.quantity) DESC
            """)
    List<Long> findTrendingProductIds(Pageable pageable);
}
