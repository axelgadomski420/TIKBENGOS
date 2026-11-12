package com.elif.repositories.service;

import com.elif.entities.service.ServiceReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ServiceReviewRepository extends JpaRepository<ServiceReview, Long> {

    List<ServiceReview> findByServiceIdOrderByCreatedAtDesc(Long serviceId);

    List<ServiceReview> findByUserId(Long userId);

    boolean existsByServiceIdAndUserId(Long serviceId, Long userId);

    Optional<ServiceReview> findByServiceIdAndUserId(Long serviceId, Long userId);

    @Query("SELECT AVG(r.rating) FROM ServiceReview r WHERE r.service.id = :serviceId")
    Double computeAverageRating(@Param("serviceId") Long serviceId);

    @Query("SELECT COUNT(r) FROM ServiceReview r WHERE r.service.id = :serviceId")
    long countByServiceId(@Param("serviceId") Long serviceId);
}
