package com.elif.services.service;

import com.elif.entities.service.ServiceCategory;
import com.elif.repositories.service.ServiceCategoryRepository;
import com.elif.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ServiceCategoryService {

    private final ServiceCategoryRepository serviceCategoryRepository;

    public ServiceCategoryService(ServiceCategoryRepository serviceCategoryRepository) {
        this.serviceCategoryRepository = serviceCategoryRepository;
    }

    public List<ServiceCategory> getAll() {
        return serviceCategoryRepository.findAll();
    }

    public ServiceCategory getById(Long id) {
        return serviceCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceCategory not found with id: " + id));
    }

    public ServiceCategory create(ServiceCategory serviceCategory) {
        return serviceCategoryRepository.save(serviceCategory);
    }

    public ServiceCategory update(Long id, ServiceCategory serviceCategory) {
        ServiceCategory existing = getById(id);
        if (serviceCategory.getName() != null) {
            existing.setName(serviceCategory.getName());
        }
        if (serviceCategory.getDescription() != null) {
            existing.setDescription(serviceCategory.getDescription());
        }
        return serviceCategoryRepository.save(existing);
    }

    public void delete(Long id) {
        ServiceCategory serviceCategory = getById(id);
        serviceCategoryRepository.delete(serviceCategory);
    }

    public ServiceCategory getByName(String name) {
        return serviceCategoryRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceCategory not found with name: " + name));
    }
}
