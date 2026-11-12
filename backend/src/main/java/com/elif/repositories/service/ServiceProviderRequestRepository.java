package com.elif.repositories.service;

import com.elif.entities.service.ServiceProviderRequest;
import com.elif.entities.service.ServiceProviderRequest.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceProviderRequestRepository extends JpaRepository<ServiceProviderRequest, Long> {

    Optional<ServiceProviderRequest> findByUserId(Long userId);

    List<ServiceProviderRequest> findByStatus(RequestStatus status);

    boolean existsByUserIdAndStatus(Long userId, RequestStatus status);
}
