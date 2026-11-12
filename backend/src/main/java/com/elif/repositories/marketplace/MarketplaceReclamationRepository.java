package com.elif.repositories.marketplace;

import com.elif.entities.marketplace.MarketplaceReclamation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarketplaceReclamationRepository extends JpaRepository<MarketplaceReclamation, Long> {
    List<MarketplaceReclamation> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<MarketplaceReclamation> findByOrderIdOrderByCreatedAtDesc(Long orderId);
}
