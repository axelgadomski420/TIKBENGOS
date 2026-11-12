package com.elif.repositories.service;


import org.springframework.data.jpa.repository.JpaRepository;
import com.elif.entities.service.ServiceAvailability;
import java.time.LocalDate;
import java.util.List;

public interface ServiceAvailabilityRepository extends JpaRepository<ServiceAvailability, Long> {
    List<ServiceAvailability> findByServiceIdAndDate(Long serviceId, LocalDate date);
    List<ServiceAvailability> findByServiceId(Long serviceId);
    List<ServiceAvailability> findByIsAvailableTrue();
    List<ServiceAvailability> findByDate(LocalDate date);
}
