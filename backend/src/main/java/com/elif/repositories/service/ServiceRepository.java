package com.elif.repositories.service;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.elif.entities.service.Service;
import java.util.List;

public interface ServiceRepository extends JpaRepository<Service, Long> {
    List<Service> findByCategoryId(Long categoryId);
    List<Service> findByStatus(String status);

    /**
     * Returns all active services sorted by rating descending (top-rated first)
     */
    @Query("SELECT s FROM Service s WHERE s.status = 'ACTIVE' ORDER BY s.rating DESC")
    List<Service> findActiveByRatingDesc();

    /**
     * Returns all active services of a given category
     */
    @Query("SELECT s FROM Service s WHERE s.status = 'ACTIVE' AND s.category.id = :categoryId")
    List<Service> findActiveByCategoryId(@Param("categoryId") Long categoryId);

    /**
     * Returns service IDs booked more than once (most popular services).
     * Returns list of [serviceId, count] pairs.
     */
    @Query("SELECT b.service.id, COUNT(b) FROM ServiceBooking b " +
           "WHERE b.service IS NOT NULL " +
           "GROUP BY b.service.id ORDER BY COUNT(b) DESC")
    List<Object[]> findServicePopularityCounts();
}