package com.elif.services.service;

import com.elif.entities.service.ServiceOption;
import com.elif.repositories.service.ServiceOptionRepository;
import com.elif.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ServiceOptionService {

    private final ServiceOptionRepository serviceOptionRepository;

    public ServiceOptionService(ServiceOptionRepository serviceOptionRepository) {
        this.serviceOptionRepository = serviceOptionRepository;
    }

    public List<ServiceOption> getAll() {
        return serviceOptionRepository.findAll();
    }

    public ServiceOption getById(Long id) {
        return serviceOptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceOption not found with id: " + id));
    }

    public ServiceOption create(ServiceOption serviceOption) {
        return serviceOptionRepository.save(serviceOption);
    }

    public ServiceOption update(Long id, ServiceOption serviceOption) {
        ServiceOption existing = getById(id);
        if (serviceOption.getName() != null) {
            existing.setName(serviceOption.getName());
        }
        if (serviceOption.getPrice() > 0) {
            existing.setPrice(serviceOption.getPrice());
        }
        if (serviceOption.getService() != null) {
            existing.setService(serviceOption.getService());
        }
        return serviceOptionRepository.save(existing);
    }

    public void delete(Long id) {
        ServiceOption serviceOption = getById(id);
        serviceOptionRepository.delete(serviceOption);
    }

    public List<ServiceOption> findByServiceId(Long serviceId) {
        return serviceOptionRepository.findByServiceId(serviceId);
    }
}
