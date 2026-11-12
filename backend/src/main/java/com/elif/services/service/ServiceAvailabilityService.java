package com.elif.services.service;

import com.elif.dto.service.ServiceAvailabilityDTO;
import com.elif.entities.service.Service;
import com.elif.entities.service.ServiceAvailability;
import com.elif.repositories.service.ServiceAvailabilityRepository;
import com.elif.repositories.service.ServiceRepository;
import com.elif.exceptions.ResourceNotFoundException;
import java.util.List;
import java.time.LocalDate;

@org.springframework.stereotype.Service
public class ServiceAvailabilityService {

    private final ServiceAvailabilityRepository serviceAvailabilityRepository;
    private final ServiceRepository serviceRepository;

    public ServiceAvailabilityService(ServiceAvailabilityRepository serviceAvailabilityRepository,
                                      ServiceRepository serviceRepository) {
        this.serviceAvailabilityRepository = serviceAvailabilityRepository;
        this.serviceRepository = serviceRepository;
    }

    public List<ServiceAvailability> getAll() {
        return serviceAvailabilityRepository.findAll();
    }

    public ServiceAvailability getById(Long id) {
        return serviceAvailabilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceAvailability not found with id: " + id));
    }

    public ServiceAvailability create(ServiceAvailability serviceAvailability) {
        return serviceAvailabilityRepository.save(serviceAvailability);
    }

    public ServiceAvailability create(ServiceAvailabilityDTO dto) {
        Service service = serviceRepository.findById(dto.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service not found with id: " + dto.getServiceId()));

        ServiceAvailability serviceAvailability = new ServiceAvailability();
        serviceAvailability.setDate(dto.getDate());
        serviceAvailability.setStartTime(dto.getStartTime());
        serviceAvailability.setEndTime(dto.getEndTime());
        serviceAvailability.setAvailable(dto.getIsAvailable() != null && dto.getIsAvailable());
        serviceAvailability.setService(service);

        return serviceAvailabilityRepository.save(serviceAvailability);
    }

    public ServiceAvailability update(Long id, ServiceAvailability serviceAvailability) {
        ServiceAvailability existing = getById(id);
        if (serviceAvailability.getDate() != null) {
            existing.setDate(serviceAvailability.getDate());
        }
        if (serviceAvailability.getStartTime() != null) {
            existing.setStartTime(serviceAvailability.getStartTime());
        }
        if (serviceAvailability.getEndTime() != null) {
            existing.setEndTime(serviceAvailability.getEndTime());
        }
        existing.setAvailable(serviceAvailability.isAvailable());
        if (serviceAvailability.getService() != null) {
            existing.setService(serviceAvailability.getService());
        }
        return serviceAvailabilityRepository.save(existing);
    }

    public ServiceAvailability update(Long id, ServiceAvailabilityDTO dto) {
        ServiceAvailability existing = getById(id);

        if (dto.getDate() != null) {
            existing.setDate(dto.getDate());
        }
        if (dto.getStartTime() != null) {
            existing.setStartTime(dto.getStartTime());
        }
        if (dto.getEndTime() != null) {
            existing.setEndTime(dto.getEndTime());
        }
        if (dto.getIsAvailable() != null) {
            existing.setAvailable(dto.getIsAvailable());
        }
        if (dto.getServiceId() != null) {
            Service service = serviceRepository.findById(dto.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service not found with id: " + dto.getServiceId()));
            existing.setService(service);
        }

        return serviceAvailabilityRepository.save(existing);
    }

    public void delete(Long id) {
        ServiceAvailability serviceAvailability = getById(id);
        serviceAvailabilityRepository.delete(serviceAvailability);
    }

    public List<ServiceAvailability> findByServiceId(Long serviceId) {
        return serviceAvailabilityRepository.findByServiceId(serviceId);
    }

    public List<ServiceAvailability> findByAvailableTrue() {
        return serviceAvailabilityRepository.findByIsAvailableTrue();
    }

    public List<ServiceAvailability> findByDate(LocalDate date) {
        return serviceAvailabilityRepository.findByDate(date);
    }
}
