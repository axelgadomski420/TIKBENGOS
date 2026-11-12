package com.elif.repositories.marketplace;

import com.elif.entities.marketplace.PromoCodeReward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PromoCodeRewardRepository extends JpaRepository<PromoCodeReward, Long> {
    boolean existsByPromoCode(String promoCode);

    Optional<PromoCodeReward> findByPromoCode(String promoCode);
}
