package com.elif.controllers.service;

import com.elif.dto.service.ServiceDTO;
import com.elif.entities.service.Service;
import com.elif.services.service.ServiceService;
import com.elif.exceptions.ResourceNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/services")
public class ServiceController {

    private final ServiceService serviceService;

    public ServiceController(ServiceService serviceService) {
        this.serviceService = serviceService;
    }

    @GetMapping
    public ResponseEntity<List<Service>> getAll() {
        List<Service> services = serviceService.getAll();
        return ResponseEntity.ok(services);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Service> getById(@PathVariable Long id) {
        Service service = serviceService.getById(id);
        return ResponseEntity.ok(service);
    }

    @PostMapping
    public ResponseEntity<Service> create(@RequestBody ServiceDTO serviceDTO) {
        Service created = serviceService.create(serviceDTO);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Service> update(@PathVariable Long id, @RequestBody ServiceDTO serviceDTO) {
        Service updated = serviceService.update(id, serviceDTO);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serviceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-category/{categoryId}")
    public ResponseEntity<List<Service>> findByCategoryId(@PathVariable Long categoryId) {
        List<Service> services = serviceService.findByCategoryId(categoryId);
        return ResponseEntity.ok(services);
    }

    @GetMapping("/by-status/{status}")
    public ResponseEntity<List<Service>> findByStatus(@PathVariable String status) {
        List<Service> services = serviceService.findByStatus(status);
        return ResponseEntity.ok(services);
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<com.elif.dto.service.RecommendedServiceDTO>> getRecommendations(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long currentServiceId,
            @RequestParam(required = false) String location) {
        List<com.elif.dto.service.RecommendedServiceDTO> recommendations = serviceService.getRecommendations(userId,
                currentServiceId, location);
        return ResponseEntity.ok(recommendations);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleResourceNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body(e.getMessage());
    }
}
