package com.elif.repositories.service;

import org.springframework.data.jpa.repository.JpaRepository;
import com.elif.entities.service.ServiceOption;
import java.util.List;

public interface ServiceOptionRepository extends JpaRepository<ServiceOption, Long> {
    List<ServiceOption> findByServiceId(Long serviceId);
}
