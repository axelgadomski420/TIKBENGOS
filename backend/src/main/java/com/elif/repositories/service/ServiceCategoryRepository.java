package com.elif.repositories.service;


import org.springframework.data.jpa.repository.JpaRepository;
import com.elif.entities.service.ServiceCategory;
import java.util.Optional;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, Long> {
    Optional<ServiceCategory> findByName(String name);
}