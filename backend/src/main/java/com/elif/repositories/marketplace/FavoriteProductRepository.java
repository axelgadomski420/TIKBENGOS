package com.elif.repositories.marketplace;

import com.elif.entities.marketplace.FavoriteProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface FavoriteProductRepository extends JpaRepository<FavoriteProduct, Long> {

    List<FavoriteProduct> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByProductIdAndUserId(Long productId, Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM FavoriteProduct f WHERE f.product.id = :productId AND f.userId = :userId")
    void deleteByProductIdAndUserId(Long productId, Long userId);
}
