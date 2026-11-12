package com.elif.repositories.service;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.elif.entities.service.ServiceBooking;
import java.time.LocalDate;
import java.util.List;

public interface ServiceBookingRepository extends JpaRepository<ServiceBooking, Long> {
    List<ServiceBooking> findByUserId(Long userId);
    List<ServiceBooking> findByServiceId(Long serviceId);
    List<ServiceBooking> findByStatus(String status);

    /**
     * Toutes les réservations liées aux services d'un provider donné
     */
    @Query("SELECT b FROM ServiceBooking b WHERE b.service.provider.id = :providerId")
    List<ServiceBooking> findByServiceProviderId(@Param("providerId") Long providerId);

    /**
     * Réservations du jour pour un provider
     */
    @Query("SELECT b FROM ServiceBooking b WHERE b.service.provider.id = :providerId " +
           "AND FUNCTION('DATE', b.bookingDate) = :today")
    List<ServiceBooking> findTodayBookingsByProviderId(
        @Param("providerId") Long providerId,
        @Param("today") LocalDate today
    );
}